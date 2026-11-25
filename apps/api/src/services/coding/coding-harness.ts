/**
 * Typed harness generation for compiled languages (Java, C++).
 *
 * The candidate's method signature is parsed from their source, each test case's JSON arguments
 * are emitted as typed literals, and the return value is serialised to JSON by generic helpers.
 * One binary serves every test case; the case index is passed as argv[1].
 */

export const RESULT_MARKER = '@@NR_RESULT@@';

type Scalar = 'int' | 'long' | 'double' | 'bool' | 'string';
export type TypeNode =
  | { kind: Scalar }
  | { kind: 'list'; elem: TypeNode; javaForm: 'array' | 'list' };

export interface MethodSignature {
  name: string;
  returnType: string;
  params: { type: TypeNode; name: string }[];
  /** Enclosing class/struct name, or null for a free function (C++). */
  owner: string | null;
}

/** Reads the value after the last result marker. The marker may follow unterminated candidate output. */
export function parseMarkedResult(stdout: string): { actual: unknown; error?: string } | null {
  const at = stdout.lastIndexOf(RESULT_MARKER);
  if (at === -1) return null;
  const end = stdout.indexOf('\n', at);
  const payload = stdout.slice(at + RESULT_MARKER.length, end === -1 ? undefined : end);
  try {
    return { actual: JSON.parse(payload) };
  } catch {
    return { actual: null, error: `Output parsing failed: ${payload.slice(0, 200)}` };
  }
}

export const ERROR_MARKER = '@@NR_ERROR@@';

export class HarnessError extends Error {}

/** `two_sum` -> `twoSum`. */
export function toCamelCase(name: string): string {
  return name.replace(/_+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function toSnakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Every spelling of the entry point a candidate might reasonably use, most exact first. */
export function candidateMethodNames(entryPoint: string): string[] {
  return [...new Set([entryPoint, toCamelCase(entryPoint), toSnakeCase(entryPoint)])].filter((n) =>
    /^[A-Za-z_$][\w$]*$/.test(n)
  );
}

// ---------- type parsing ----------

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '<' || ch === '(' || ch === '[') depth++;
    if (ch === '>' || ch === ')' || ch === ']') depth--;
    if (ch === separator && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

export function parseJavaType(raw: string): TypeNode {
  const t = raw.replace(/\bfinal\b/g, '').trim();
  if (t.endsWith('[]')) {
    return { kind: 'list', elem: parseJavaType(t.slice(0, -2)), javaForm: 'array' };
  }
  const generic = /^(?:java\.util\.)?(?:List|ArrayList|LinkedList|Collection)\s*<(.+)>$/.exec(t);
  if (generic) return { kind: 'list', elem: parseJavaType(generic[1]), javaForm: 'list' };
  switch (t) {
    case 'int': case 'Integer': case 'short': case 'byte': return { kind: 'int' };
    case 'long': case 'Long': return { kind: 'long' };
    case 'double': case 'Double': case 'float': case 'Float': return { kind: 'double' };
    case 'boolean': case 'Boolean': return { kind: 'bool' };
    case 'String': return { kind: 'string' };
    default: throw new HarnessError(`Unsupported Java type '${t}'. Use int, long, double, boolean, String, arrays or List.`);
  }
}

export function parseCppType(raw: string): TypeNode {
  const t = raw
    .replace(/\bconst\b/g, '')
    .replace(/&/g, '')
    .replace(/\bstd::/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const vec = /^vector\s*<(.+)>$/.exec(t);
  if (vec) return { kind: 'list', elem: parseCppType(vec[1]), javaForm: 'list' };
  switch (t) {
    case 'int': case 'short': case 'unsigned': case 'unsigned int': return { kind: 'int' };
    case 'long': case 'long long': case 'long int': case 'long long int': case 'int64_t': case 'size_t':
      return { kind: 'long' };
    case 'double': case 'float': return { kind: 'double' };
    case 'bool': return { kind: 'bool' };
    case 'string': return { kind: 'string' };
    default: throw new HarnessError(`Unsupported C++ type '${t}'. Use int, long long, double, bool, string or vector.`);
  }
}

// ---------- signature extraction ----------

function stripCommentsAndStrings(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Lang = 'java' | 'cpp';

export function findSignature(code: string, lang: Lang, methodNames: string[]): MethodSignature {
  const clean = stripCommentsAndStrings(code);
  const parseType = lang === 'java' ? parseJavaType : parseCppType;

  for (const methodName of methodNames) {
    const re = new RegExp(
      `([A-Za-z_][\\w:<>,\\s\\[\\]&*]*?)\\s+${escapeRegex(methodName)}\\s*\\(([^)]*)\\)\\s*(?:const\\s*)?(?:throws\\s+[\\w.,\\s]+)?\\{`,
      'g'
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) {
      const returnType = m[1]
        .replace(/\b(?:public|private|protected)\s*:/g, '')
        .replace(/\b(public|private|protected|static|final|inline|virtual)\b/g, '')
        .trim();
      // Skip call sites such as `return foo(x) {`; a declaration's return type is a type, not a keyword.
      if (!returnType || /\b(return|new|else|throw)\b/.test(returnType)) continue;

      const params = splitTopLevel(m[2], ',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const decl = lang === 'cpp' ? p.replace(/&/g, ' ').replace(/\*/g, ' ') : p;
          // `int[] nums` or C-style `int nums[]`: only brackets after the name add dimensions.
          const pm = /^([\s\S]*?)([A-Za-z_]\w*)\s*((?:\[\s*\])*)\s*$/.exec(decl);
          if (!pm || !pm[1].trim()) throw new HarnessError(`Cannot parse parameter '${p}'.`);
          const suffixDims = (pm[3].match(/\[/g) || []).length;
          const baseType = pm[1].trim() + '[]'.repeat(suffixDims);
          return { type: parseType(baseType), name: pm[2] };
        });

      const owner = findOwner(clean, m.index, lang);
      return { name: methodName, returnType, params, owner };
    }
  }
  throw new HarnessError(
    `Entry point '${methodNames[methodNames.length - 1]}' not found in your code. ` +
      `Keep the function/method name from the starter code.`
  );
}

function findOwner(clean: string, index: number, lang: Lang): string | null {
  const re = lang === 'java' ? /\bclass\s+(\w+)/g : /\b(?:class|struct)\s+(\w+)/g;
  let owner: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean.slice(0, index))) !== null) owner = m[1];
  if (lang === 'java' && !owner) throw new HarnessError('Java code must declare a class containing the solution method.');
  return owner;
}

// ---------- literal generation ----------

function javaStringLiteral(value: string): string {
  let out = '"';
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    const ch = value[i];
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (c < 32) out += '\\' + c.toString(8).padStart(3, '0');
    else if (c > 126) out += '\\u' + c.toString(16).padStart(4, '0');
    else out += ch;
  }
  return out + '"';
}

function cppStringLiteral(value: string): string {
  let out = '"';
  for (const byte of Buffer.from(value, 'utf-8')) {
    const ch = String.fromCharCode(byte);
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (byte >= 32 && byte <= 126 && ch !== '?') out += ch;
    else out += '\\' + byte.toString(8).padStart(3, '0');
  }
  return out + '"';
}

function expectNumber(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HarnessError(`Test input mismatch: expected ${what}, received ${JSON.stringify(value)}.`);
  }
  return value;
}

const BOXED: Record<Scalar, string> = { int: 'Integer', long: 'Long', double: 'Double', bool: 'Boolean', string: 'String' };

export function javaTypeName(node: TypeNode): string {
  if (node.kind !== 'list') {
    return node.kind === 'bool' ? 'boolean' : node.kind === 'string' ? 'String' : node.kind;
  }
  return node.javaForm === 'array' ? `${javaTypeName(node.elem)}[]` : `List<${javaBoxedName(node.elem)}>`;
}

function javaBoxedName(node: TypeNode): string {
  return node.kind === 'list' ? javaTypeName(node) : BOXED[node.kind];
}

export function javaLiteral(node: TypeNode, value: unknown): string {
  switch (node.kind) {
    case 'int': {
      const n = expectNumber(value, 'an int');
      if (!Number.isInteger(n) || Math.abs(n) > 2147483647) throw new HarnessError(`Value ${n} does not fit in int.`);
      return String(n);
    }
    case 'long': return `${expectNumber(value, 'a long')}L`;
    case 'double': return `((double) ${expectNumber(value, 'a double')})`;
    case 'bool':
      if (typeof value !== 'boolean') throw new HarnessError(`Test input mismatch: expected a boolean.`);
      return String(value);
    case 'string':
      if (typeof value !== 'string') throw new HarnessError(`Test input mismatch: expected a string.`);
      return javaStringLiteral(value);
    case 'list': {
      if (!Array.isArray(value)) throw new HarnessError(`Test input mismatch: expected an array.`);
      const items = value.map((v) => javaLiteral(node.elem, v)).join(', ');
      if (node.javaForm === 'array') return `new ${javaTypeName(node)}{${items}}`;
      const boxed = javaBoxedName(node.elem);
      return value.length === 0
        ? `new ArrayList<${boxed}>()`
        : `new ArrayList<${boxed}>(Arrays.<${boxed}>asList(${items}))`;
    }
  }
}

export function cppTypeName(node: TypeNode): string {
  if (node.kind === 'list') return `vector<${cppTypeName(node.elem)}>`;
  return { int: 'int', long: 'long long', double: 'double', bool: 'bool', string: 'string' }[node.kind];
}

export function cppLiteral(node: TypeNode, value: unknown): string {
  switch (node.kind) {
    case 'int': {
      const n = expectNumber(value, 'an int');
      if (!Number.isInteger(n) || Math.abs(n) > 2147483647) throw new HarnessError(`Value ${n} does not fit in int.`);
      return String(n);
    }
    case 'long': return `${expectNumber(value, 'a long long')}LL`;
    case 'double': return `((double) ${expectNumber(value, 'a double')})`;
    case 'bool':
      if (typeof value !== 'boolean') throw new HarnessError(`Test input mismatch: expected a boolean.`);
      return String(value);
    case 'string':
      if (typeof value !== 'string') throw new HarnessError(`Test input mismatch: expected a string.`);
      return `string(${cppStringLiteral(value)}, ${Buffer.byteLength(value, 'utf-8')})`;
    case 'list': {
      if (!Array.isArray(value)) throw new HarnessError(`Test input mismatch: expected an array.`);
      return `${cppTypeName(node)}{${value.map((v) => cppLiteral(node.elem, v)).join(', ')}}`;
    }
  }
}

// ---------- program generation ----------

function checkArity(sig: MethodSignature, args: unknown[], caseName: string): void {
  if (sig.params.length !== args.length) {
    throw new HarnessError(
      `Test case "${caseName}" passes ${args.length} argument(s) but '${sig.name}' declares ${sig.params.length}.`
    );
  }
}

const JAVA_MAIN_PRELUDE = `
import java.util.*;

public class Main {
  static void ser(StringBuilder sb, Object o) {
    if (o == null) { sb.append("null"); return; }
    if (o instanceof Boolean) { sb.append(o.toString()); return; }
    if (o instanceof Double || o instanceof Float) {
      double d = ((Number) o).doubleValue();
      sb.append(Double.isNaN(d) || Double.isInfinite(d) ? "null" : o.toString());
      return;
    }
    if (o instanceof Number) { sb.append(o.toString()); return; }
    if (o instanceof Character || o instanceof CharSequence) {
      String s = o.toString();
      sb.append('"');
      for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (c == '"') sb.append("\\\\\\"");
        else if (c == '\\\\') sb.append("\\\\\\\\");
        else if (c < 32 || c > 126) sb.append(String.format("\\\\u%04x", (int) c));
        else sb.append(c);
      }
      sb.append('"');
      return;
    }
    sb.append('[');
    boolean first = true;
    if (o.getClass().isArray()) {
      int n = java.lang.reflect.Array.getLength(o);
      for (int i = 0; i < n; i++) {
        if (!first) sb.append(',');
        first = false;
        ser(sb, java.lang.reflect.Array.get(o, i));
      }
    } else if (o instanceof Iterable) {
      for (Object e : (Iterable<?>) o) {
        if (!first) sb.append(',');
        first = false;
        ser(sb, e);
      }
    } else {
      sb.setLength(sb.length() - 1);
      ser(sb, String.valueOf(o));
      return;
    }
    sb.append(']');
  }

  static void emit(Object o) {
    StringBuilder sb = new StringBuilder();
    ser(sb, o);
    System.out.println("${RESULT_MARKER}" + sb);
    System.out.flush();
  }
`;

export function buildJavaMain(
  sig: MethodSignature,
  cases: { name: string; args: unknown[] }[]
): string {
  const branches = cases.map((tc, i) => {
    checkArity(sig, tc.args, tc.name);
    const decls = sig.params
      .map((p, j) => `        ${javaTypeName(p.type)} a${j} = ${javaLiteral(p.type, tc.args[j])};`)
      .join('\n');
    const call = `new ${sig.owner}().${sig.name}(${sig.params.map((_, j) => `a${j}`).join(', ')})`;
    const body = /^void$/.test(sig.returnType) ? `${call};\n        emit(null);` : `emit(${call});`;
    return `      case ${i}: {\n${decls}\n        ${body}\n        break;\n      }`;
  });
  return `${JAVA_MAIN_PRELUDE}
  public static void main(String[] args) throws Exception {
    int idx = Integer.parseInt(args[0]);
    switch (idx) {
${branches.join('\n')}
      default: throw new IllegalArgumentException("Unknown test index " + idx);
    }
  }
}
`;
}

const CPP_PRELUDE = `
#include <bits/stdc++.h>
using namespace std;
`;

const CPP_SERIALIZER = `
static void nr_ser(ostream& o, bool v) { o << (v ? "true" : "false"); }
static void nr_ser(ostream& o, const string& s) {
  o << '"';
  for (unsigned char c : s) {
    if (c == '"') o << "\\\\\\"";
    else if (c == '\\\\') o << "\\\\\\\\";
    else if (c < 32) { char b[8]; snprintf(b, sizeof b, "\\\\u%04x", c); o << b; }
    else o << (char) c;
  }
  o << '"';
}
static void nr_ser(ostream& o, const char* s) { nr_ser(o, string(s)); }
template <class T>
typename enable_if<is_arithmetic<T>::value && !is_same<T, bool>::value>::type nr_ser(ostream& o, T v) {
  if (is_floating_point<T>::value && !isfinite((double) v)) { o << "null"; return; }
  ostringstream tmp; tmp << setprecision(15) << v; o << tmp.str();
}
template <class T>
void nr_ser(ostream& o, const vector<T>& v) {
  o << '[';
  for (size_t i = 0; i < v.size(); i++) { if (i) o << ','; T e = v[i]; nr_ser(o, e); }
  o << ']';
}
`;

export function buildCppProgram(
  userCode: string,
  sig: MethodSignature,
  cases: { name: string; args: unknown[] }[]
): string {
  const branches = cases.map((tc, i) => {
    checkArity(sig, tc.args, tc.name);
    const decls = sig.params
      .map((p, j) => `      ${cppTypeName(p.type)} a${j} = ${cppLiteral(p.type, tc.args[j])};`)
      .join('\n');
    const callee = sig.owner ? `${sig.owner}().${sig.name}` : sig.name;
    const call = `${callee}(${sig.params.map((_, j) => `a${j}`).join(', ')})`;
    const body = /^void$/.test(sig.returnType)
      ? `${call}; cout << "${RESULT_MARKER}null" << endl;`
      : `auto r = ${call}; cout << "${RESULT_MARKER}"; nr_ser(cout, r); cout << endl;`;
    return `    case ${i}: {\n${decls}\n      ${body}\n      break;\n    }`;
  });
  return `${CPP_PRELUDE}
${userCode}
${CPP_SERIALIZER}
int main(int argc, char** argv) {
  int idx = argc > 1 ? atoi(argv[1]) : -1;
  switch (idx) {
${branches.join('\n')}
    default: return 2;
  }
  return 0;
}
`;
}
