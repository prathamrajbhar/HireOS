import { jsPDF } from 'jspdf';
import type { Application } from '@/types';
import { formatCompensationLPA } from '@/app/candidate/profile/_utils/profileUtils';

interface ParsedResumeInfo {
  fullName?: string;
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  targetRoles?: string[];
  yearsOfExperience?: number;
  proudProject?: string;
  education?: Array<{ degree?: string; institution?: string; year?: string; dates?: string; gpa?: string }>;
  experience?: Array<{ company?: string; role?: string; duration?: string; description?: string; highlights?: string[] }>;
  projects?: Array<{ title?: string; name?: string; description?: string; techStack?: string[]; impact?: string }>;
}

/**
 * Downloads candidate resume.
 * 1. If an original uploaded PDF exists at app.resumeUrl, downloads that file directly.
 * 2. If no file exists or download fails, generates a full, professional ATS-compliant PDF document.
 */
export async function downloadCandidateResumePdf(
  app: Application,
  jobTitle?: string
): Promise<void> {
  const filename = `${(app.candidateName || 'Candidate').replace(/\s+/g, '_')}_Resume.pdf`;

  // 1. Check if candidate has an actual uploaded PDF file
  if (app.resumeUrl && (app.resumeUrl.startsWith('http://') || app.resumeUrl.startsWith('https://') || app.resumeUrl.startsWith('/uploads/'))) {
    try {
      const res = await fetch(app.resumeUrl, { mode: 'cors' });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        const blob = await res.blob();
        const header = await blob.slice(0, 5).text();
        if (contentType.includes('pdf') || header.startsWith('%PDF')) {
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
          return;
        }
      }
    } catch {
      // If fetching external URL fails (e.g. CORS or network), proceed to generate a valid PDF
    }
  }

  // 2. Generate a valid, professionally structured PDF document using jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const parsed = (app.parsedResume || {}) as ParsedResumeInfo;
  const candidateName = parsed.fullName || app.candidateName || 'Candidate Profile';
  const roleTitle = parsed.headline || jobTitle || app.jobTitle || 'Professional Candidate';

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin - 30) {
      doc.addPage();
      currentY = margin;
      // Header on continuation pages
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`${candidateName} — Candidate Dossier (Cont.)`, margin, currentY);
      currentY += 16;
    }
  };

  // Header Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(candidateName, margin, currentY);
  currentY += 20;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12); // brand orange #ea580c
  doc.text(roleTitle.toUpperCase(), margin, currentY);
  currentY += 16;

  // Contact & Location Line
  const contactParts: string[] = [];
  if (app.candidateEmail) contactParts.push(app.candidateEmail);
  if (parsed.phone) contactParts.push(parsed.phone);
  const location = app.location || parsed.location;
  if (location) contactParts.push(location);
  if (typeof app.yearsOfExperience === 'number') contactParts.push(`${app.yearsOfExperience} yrs exp`);
  if (app.noticePeriod) contactParts.push(`Notice: ${app.noticePeriod}`);
  if (typeof app.expectedSalary === 'number') contactParts.push(`Expected: ${formatCompensationLPA(app.expectedSalary)}`);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(contactParts.join('  •  '), margin, currentY);
  currentY += 14;

  // Horizontal Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 16;

  // Section: Application Status Snapshot
  checkPageBreak(40);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, currentY, contentWidth, 32, 4, 4, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('PIPELINE STAGE', margin + 12, currentY + 14);
  doc.text('OVERALL AI MATCH', margin + 150, currentY + 14);
  doc.text('APPLIED ROLE', margin + 310, currentY + 14);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(app.stage || 'Applied', margin + 12, currentY + 26);
  const compositeScore = app.scores?.composite;
  if (compositeScore !== undefined) {
    if (compositeScore >= 70) {
      doc.setTextColor(16, 185, 129); // emerald-500
    } else {
      doc.setTextColor(234, 88, 12); // brand orange #ea580c
    }
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text(compositeScore !== undefined ? `${compositeScore}% Match` : 'Evaluation Pending', margin + 150, currentY + 26);
  doc.setTextColor(15, 23, 42);
  doc.text(app.jobTitle || 'N/A', margin + 310, currentY + 26);
  currentY += 46;

  // Helper for Section Titles
  const addSectionTitle = (title: string) => {
    checkPageBreak(28);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(title.toUpperCase(), margin, currentY);
    currentY += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 12;
  };

  // Section: Professional Summary / Bio
  const bio = parsed.bio || '';
  if (bio) {
    addSectionTitle('Professional Summary');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700
    const bioLines = doc.splitTextToSize(bio, contentWidth);
    checkPageBreak(bioLines.length * 13);
    doc.text(bioLines, margin, currentY);
    currentY += bioLines.length * 13 + 12;
  }

  // Section: Core Skills & Competencies
  const skills = app.skills?.length ? app.skills : parsed.skills || [];
  if (skills.length > 0) {
    addSectionTitle('Verified Tech Stack & Core Competencies');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const skillsText = skills.join('   •   ');
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 13);
    doc.text(skillLines, margin, currentY);
    currentY += skillLines.length * 13 + 12;
  }

  // Section: Work Experience History
  const experience = (app.workExperience?.length ? app.workExperience : parsed.experience) || [];
  if (experience.length > 0) {
    addSectionTitle('Work Experience History');
    experience.forEach((exp) => {
      const role = exp.role || 'Position';
      const company = exp.company || 'Company';
      const duration = exp.duration || '';

      checkPageBreak(40);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${role}  —  ${company}`, margin, currentY);

      if (duration) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const durationWidth = doc.getTextWidth(duration);
        doc.text(duration, pageWidth - margin - durationWidth, currentY);
      }
      currentY += 13;

      const desc = exp.description;
      if (desc) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const descLines = doc.splitTextToSize(desc, contentWidth - 10);
        checkPageBreak(descLines.length * 12);
        doc.text(descLines, margin + 8, currentY);
        currentY += descLines.length * 12 + 6;
      } else {
        currentY += 4;
      }
    });
    currentY += 6;
  }

  // Section: Featured Technical Projects
  const proudProject = parsed.proudProject;
  const projectList = parsed.projects || [];
  if (proudProject || projectList.length > 0) {
    addSectionTitle('Featured Technical Projects');
    if (proudProject) {
      checkPageBreak(30);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('Key Technical Highlight:', margin, currentY);
      currentY += 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const projLines = doc.splitTextToSize(proudProject, contentWidth);
      checkPageBreak(projLines.length * 12);
      doc.text(projLines, margin, currentY);
      currentY += projLines.length * 12 + 10;
    }

    projectList.forEach((proj) => {
      const title = proj.title || proj.name || 'Project';
      const tech = proj.techStack?.length ? ` [${proj.techStack.join(', ')}]` : '';
      checkPageBreak(30);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${title}${tech}`, margin, currentY);
      currentY += 12;

      if (proj.description) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const descLines = doc.splitTextToSize(proj.description, contentWidth);
        checkPageBreak(descLines.length * 12);
        doc.text(descLines, margin, currentY);
        currentY += descLines.length * 12 + 8;
      }
    });
  } else if (experience.length === 0 && app.rawResumeText) {
    addSectionTitle('Candidate Background & Experience Details');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const rawLines = doc.splitTextToSize(app.rawResumeText.trim().slice(0, 1500), contentWidth);
    checkPageBreak(rawLines.length * 12);
    doc.text(rawLines, margin, currentY);
    currentY += rawLines.length * 12 + 10;
  }

  // Section: Education & Credentials
  const education = parsed.education || [];
  if (education.length > 0) {
    addSectionTitle('Education & Credentials');
    education.forEach((edu) => {
      checkPageBreak(26);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const degree = edu.degree || 'Degree';
      const inst = edu.institution ? ` — ${edu.institution}` : '';
      doc.text(`${degree}${inst}`, margin, currentY);

      const dates = edu.year || edu.dates || '';
      if (dates) {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const datesWidth = doc.getTextWidth(dates);
        doc.text(dates, pageWidth - margin - datesWidth, currentY);
      }
      currentY += 16;
    });
  }

  // Section: AI Assessment & Evaluation Breakdown
  if (app.scores || app.reasoning || app.rejectionReason) {
    addSectionTitle('HireOS AI Assessment & Evaluator Dossier');

    if (app.scores) {
      checkPageBreak(36);
      const colW = contentWidth / 4;
      const categories = [
        { label: 'Technical', val: app.scores.technical },
        { label: 'Communication', val: app.scores.communication },
        { label: 'Problem Solving', val: app.scores.problemSolving },
        { label: 'Experience', val: app.scores.experience },
      ];

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, 'F');

      categories.forEach((cat, idx) => {
        const xPos = margin + idx * colW + 10;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(cat.label.toUpperCase(), xPos, currentY + 12);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${cat.val}%`, xPos, currentY + 24);
      });
      currentY += 40;
    }

    const note = app.rejectionReason || app.reasoning;
    if (note) {
      checkPageBreak(30);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(app.rejectionReason ? 185 : 100, app.rejectionReason ? 28 : 116, app.rejectionReason ? 28 : 139);
      doc.text(app.rejectionReason ? 'EVALUATION OUTCOME / REJECTION RATIONALE:' : 'AI EVALUATOR NOTES:', margin, currentY);
      currentY += 12;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const noteLines = doc.splitTextToSize(`"${note}"`, contentWidth);
      checkPageBreak(noteLines.length * 12);
      doc.text(noteLines, margin, currentY);
      currentY += noteLines.length * 12 + 10;
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.line(margin, pageHeight - margin + 10, pageWidth - margin, pageHeight - margin + 10);
    doc.text(
      `HireOS Recruiter Workspace • Confidential Candidate Dossier • Generated ${new Date().toLocaleDateString()}`,
      margin,
      pageHeight - margin + 22
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 50, pageHeight - margin + 22);
  }

  // Save and download actual PDF
  doc.save(filename);
}
