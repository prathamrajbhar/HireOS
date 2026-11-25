import '../env';
import { prisma } from '../lib/prisma';
import { signAccessToken } from '../lib/jwt';

async function testResumeUpload() {
  console.log('🧪 Starting Resume Upload & Persistence Integration Test...');

  // 1. Find a candidate
  const candidate = await prisma.user.findFirst({
    where: { role: 'candidate' },
  });

  if (!candidate) {
    throw new Error('No candidate user found in database');
  }

  console.log(`Found candidate: ${candidate.email} (${candidate.id})`);

  const token = signAccessToken({
    userId: candidate.id,
    email: candidate.email,
    role: 'candidate',
  });

  // 2. Prepare sample PDF
  const samplePdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 170 >> stream
BT
/F1 12 Tf
72 712 Td
(Alex Candidate) Tj
0 -20 Td
(alex@example.com | Full Stack Developer | 4 years experience) Tj
0 -20 Td
(Skills: TypeScript, React, Next.js, Node.js, PostgreSQL) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer << /Root 1 0 R /Size 5 >>
startxref
427
%%EOF`;

  const blob = new Blob([samplePdf], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('resume', blob, 'Alex_Candidate_Resume.pdf');

  // 3. Test POST /candidate/profile/parse-resume
  console.log('📤 Sending POST /api/v1/candidate/profile/parse-resume ...');
  const uploadRes = await fetch('http://localhost:4012/api/v1/candidate/profile/parse-resume', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const uploadJson = await uploadRes.json();
  console.log('Upload status:', uploadRes.status);
  console.log('Upload response success:', uploadJson.success);
  console.log('Returned resumeUrl:', uploadJson.data?.resumeUrl);
  console.log('Parsed profile name:', uploadJson.data?.profile?.fullName);
  console.log('Parsed profile skills:', uploadJson.data?.profile?.skills);

  if (!uploadRes.ok || !uploadJson.success || !uploadJson.data?.resumeUrl) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadJson)}`);
  }

  // 4. Verify directly in database
  const profileInDb = await prisma.candidateProfile.findUnique({
    where: { user_id: candidate.id },
    select: { resume_url: true, raw_resume_text: true, parsed_resume: true },
  });

  console.log('Database candidateProfile.resume_url:', profileInDb?.resume_url);
  if (profileInDb?.resume_url !== uploadJson.data.resumeUrl) {
    throw new Error(`Database resume_url does not match uploaded URL: ${profileInDb?.resume_url} vs ${uploadJson.data.resumeUrl}`);
  }
  console.log('✅ Database persistence verified!');

  // 5. Test GET /api/v1/candidate/profile
  console.log('📥 Calling GET /api/v1/candidate/profile ...');
  const getProfileRes = await fetch('http://localhost:4012/api/v1/candidate/profile', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const getProfileJson = await getProfileRes.json();
  console.log('GET Profile response resume_url:', getProfileJson.data?.profile?.resume_url);
  if (getProfileJson.data?.profile?.resume_url !== uploadJson.data.resumeUrl) {
    throw new Error('GET /candidate/profile did not return the active resume_url');
  }
  console.log('✅ Profile retrieval returns active resume_url!');

  // 6. Test updating profile without losing resume_url
  console.log('💾 Testing profile details save preserves resume_url ...');
  const saveRes = await fetch('http://localhost:4012/api/v1/candidate/profile', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName: 'Alex Candidate Updated',
      resumeUrl: uploadJson.data.resumeUrl,
    }),
  });
  const saveJson = await saveRes.json();
  console.log('Save response status:', saveRes.status);
  console.log('Save response resume_url:', saveJson.data?.profile?.resume_url);
  if (saveJson.data?.profile?.resume_url !== uploadJson.data.resumeUrl) {
    throw new Error('Save profile did not preserve resume_url');
  }
  console.log('✅ Profile save preserves resume_url!');

  // 7. Test deleting resume (resumeUrl: null)
  console.log('🗑️ Testing resume deletion (resumeUrl: null) ...');
  const deleteRes = await fetch('http://localhost:4012/api/v1/candidate/profile', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resumeUrl: null,
      rawResumeText: null,
      parsedResume: {},
    }),
  });
  const deleteJson = await deleteRes.json();
  console.log('Delete response status:', deleteRes.status);
  console.log('Delete response resume_url:', deleteJson.data?.profile?.resume_url);
  if (deleteJson.data?.profile?.resume_url !== null) {
    throw new Error('Delete profile did not clear resume_url in response');
  }

  const profileAfterDelete = await prisma.candidateProfile.findUnique({
    where: { user_id: candidate.id },
    select: { resume_url: true },
  });
  console.log('Database candidateProfile.resume_url after delete:', profileAfterDelete?.resume_url);
  if (profileAfterDelete?.resume_url !== null) {
    throw new Error('Delete profile did not clear resume_url in database');
  }
  console.log('✅ Resume deletion successfully cleared DB resume_url!');

  console.log('🎉 ALL RESUME UPLOAD INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

testResumeUpload()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
