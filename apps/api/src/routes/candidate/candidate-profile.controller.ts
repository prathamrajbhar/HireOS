import { Request, Response, NextFunction } from 'express';
import { CandidateProfileSchema } from '@nextround/shared';
import { prisma } from '../../lib/prisma';
import { Prisma } from '@nextround/database';
import { uploadFile } from '../../lib/storage';
import { extractTextFromBuffer, parseResumeWithGemini } from '../../services/resume/resume-parser.service';
import { enqueueEmbeddingRebuild } from '../../services/candidate/candidate-embedding.service';
import { emailService } from '../../services/email/email.service';
import { logger } from '../../lib/logger';

export async function upsertProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    let resumeUrl: string | undefined = undefined;
    let extractedRawText: string | undefined = undefined;
    let extractedParsedResume: Record<string, unknown> | undefined = undefined;

    if (req.file) {
      const fileKey = `resumes/${req.user.userId}/${Date.now()}-${req.file.originalname}`;
      resumeUrl = await uploadFile(fileKey, req.file.buffer, req.file.mimetype);

      try {
        extractedRawText = await extractTextFromBuffer(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
        if (extractedRawText) {
          extractedParsedResume = (await parseResumeWithGemini(extractedRawText)) as unknown as Record<string, unknown>;
        }
      } catch (extractErr) {
        logger.child('Profile').error(`Failed auto-extracting text on profile upload (${req.file.originalname}):`, extractErr);
      }
    }

    let bodyData = req.body;
    if (typeof req.body.data === 'string') {
      try {
        bodyData = JSON.parse(req.body.data);
      } catch {
        // use raw bodyData
      }
    }

    const validated = CandidateProfileSchema.parse(bodyData);
    const bodyHas = (key: string) => Object.prototype.hasOwnProperty.call(bodyData, key);

    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { user_id: req.user.userId },
      select: { full_name: true, settings: true },
    });
    const isFirstOnboarding = !existingProfile?.full_name && Boolean(validated.fullName);

    const existingSettings =
      existingProfile?.settings && typeof existingProfile.settings === 'object'
        ? (existingProfile.settings as Record<string, unknown>)
        : {};

    const mergedSettings: Prisma.InputJsonValue = {
      ...existingSettings,
      ...(validated.currentCompany !== undefined ? { currentCompany: validated.currentCompany } : {}),
      ...(validated.currentTitle !== undefined ? { currentTitle: validated.currentTitle } : {}),
      ...(validated.education !== undefined ? { education: validated.education } : {}),
    };

    const profile = await prisma.candidateProfile.upsert({
      where: { user_id: req.user.userId },
      create: {
        user_id: req.user.userId,
        full_name: validated.fullName,
        headline: validated.headline,
        phone: validated.phone,
        location: validated.location,
        timezone: validated.timezone,
        avatar_url: validated.avatarUrl,
        linkedin_url: validated.linkedinUrl,
        github_url: validated.githubUrl,
        portfolio_url: validated.portfolioUrl,
        bio: validated.bio,
        skills: validated.skills,
        target_roles: validated.targetRoles,
        years_of_experience: validated.yearsOfExperience,
        work_mode: validated.workMode,
        current_ctc: validated.currentCtc,
        target_locations: validated.targetLocations,
        expected_salary: validated.expectedSalary,
        notice_period: validated.noticePeriod,
        work_authorization: validated.workAuthorization,
        proud_project: validated.proudProject,
        work_values: validated.workValues,
        availability: (validated.availability as Prisma.InputJsonValue) || undefined,
        resume_url: resumeUrl || validated.resumeUrl,
        raw_resume_text: validated.rawResumeText || extractedRawText,
        parsed_resume: ((validated.parsedResume || extractedParsedResume || {}) as Prisma.InputJsonValue),
        social_data: (((validated as Record<string, unknown>).socialData || {}) as Prisma.InputJsonValue),
        settings: mergedSettings,
        data_consent: validated.dataConsent || false,
        data_consent_at: validated.consentAt
          ? new Date(validated.consentAt)
          : validated.dataConsent
          ? new Date()
          : null,
      },
      update: {
        ...(bodyHas('fullName') && validated.fullName !== undefined ? { full_name: validated.fullName } : {}),
        ...(bodyHas('headline') && validated.headline !== undefined ? { headline: validated.headline } : {}),
        ...(bodyHas('phone') && validated.phone !== undefined ? { phone: validated.phone } : {}),
        ...(bodyHas('location') && validated.location !== undefined ? { location: validated.location } : {}),
        ...(bodyHas('timezone') && validated.timezone !== undefined ? { timezone: validated.timezone } : {}),
        ...(bodyHas('avatarUrl') && validated.avatarUrl !== undefined ? { avatar_url: validated.avatarUrl } : {}),
        ...(bodyHas('linkedinUrl') && validated.linkedinUrl !== undefined ? { linkedin_url: validated.linkedinUrl } : {}),
        ...(bodyHas('githubUrl') && validated.githubUrl !== undefined ? { github_url: validated.githubUrl } : {}),
        ...(bodyHas('portfolioUrl') && validated.portfolioUrl !== undefined ? { portfolio_url: validated.portfolioUrl } : {}),
        ...(bodyHas('bio') && validated.bio !== undefined ? { bio: validated.bio } : {}),
        ...(bodyHas('skills') ? { skills: validated.skills } : {}),
        ...(bodyHas('targetRoles') ? { target_roles: validated.targetRoles } : {}),
        ...(bodyHas('yearsOfExperience') && validated.yearsOfExperience !== undefined ? { years_of_experience: validated.yearsOfExperience } : {}),
        ...(bodyHas('workMode') && validated.workMode !== undefined ? { work_mode: validated.workMode } : {}),
        ...(bodyHas('currentCtc') && validated.currentCtc !== undefined ? { current_ctc: validated.currentCtc } : {}),
        ...(bodyHas('targetLocations') ? { target_locations: validated.targetLocations } : {}),
        ...(bodyHas('expectedSalary') && validated.expectedSalary !== undefined ? { expected_salary: validated.expectedSalary } : {}),
        ...(bodyHas('noticePeriod') && validated.noticePeriod !== undefined ? { notice_period: validated.noticePeriod } : {}),
        ...(bodyHas('workAuthorization') && validated.workAuthorization !== undefined ? { work_authorization: validated.workAuthorization } : {}),
        ...(bodyHas('proudProject') && validated.proudProject !== undefined ? { proud_project: validated.proudProject } : {}),
        ...(bodyHas('workValues') ? { work_values: validated.workValues } : {}),
        ...(bodyHas('availability') ? { availability: (validated.availability as Prisma.InputJsonValue) || undefined } : {}),
        ...(resumeUrl ? { resume_url: resumeUrl } : bodyHas('resumeUrl') ? { resume_url: validated.resumeUrl ?? null } : {}),
        ...(extractedRawText ? { raw_resume_text: extractedRawText } : bodyHas('rawResumeText') ? { raw_resume_text: validated.rawResumeText ?? null } : {}),
        ...(extractedParsedResume ? { parsed_resume: (extractedParsedResume as Prisma.InputJsonValue) } : bodyHas('parsedResume') ? { parsed_resume: ((validated.parsedResume ?? {}) as Prisma.InputJsonValue) } : {}),
        ...(bodyHas('socialData') && (validated as Record<string, unknown>).socialData ? { social_data: ((validated as Record<string, unknown>).socialData as Prisma.InputJsonValue) } : {}),
        settings: mergedSettings,
        ...(bodyHas('dataConsent') ? { data_consent: validated.dataConsent ?? false } : {}),
        ...(bodyHas('dataConsent') && validated.dataConsent ? { data_consent_at: new Date() } : {}),
      },
    });

    if (profile.data_consent) {
      enqueueEmbeddingRebuild(profile.id).catch((error) =>
        logger.child('Profile').error(`Failed to enqueue embedding rebuild for candidate ${profile.id}:`, error)
      );
    }

    if (isFirstOnboarding && req.user?.email) {
      const candidateEmail = req.user.email;
      const candidateName = profile.full_name || candidateEmail.split('@')[0];
      emailService
        .sendWelcomeCandidate(candidateEmail, candidateName)
        .catch((emailErr) =>
          logger.child('Profile').error(`Failed to dispatch candidate welcome email to ${candidateEmail}:`, emailErr)
        );
    }

    const settingsObj = (profile.settings && typeof profile.settings === 'object') ? (profile.settings as Record<string, unknown>) : {};
    const formattedProfile = {
      ...profile,
      currentCompany: settingsObj.currentCompany || null,
      currentTitle: settingsObj.currentTitle || null,
      education: Array.isArray(settingsObj.education) ? settingsObj.education : [],
    };

    return res.json({
      success: true,
      data: { profile: formattedProfile },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { user_id: req.user.userId },
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Candidate profile not found' });
    }

    const settingsObj = (profile.settings && typeof profile.settings === 'object') ? (profile.settings as Record<string, unknown>) : {};
    const parsedObj = (profile.parsed_resume && typeof profile.parsed_resume === 'object') ? (profile.parsed_resume as Record<string, unknown>) : {};
    const formattedProfile = {
      ...profile,
      fullName: profile.full_name || (parsedObj.fullName as string) || null,
      headline: profile.headline || (parsedObj.headline as string) || (Array.isArray(parsedObj.targetRoles) ? (parsedObj.targetRoles[0] as string) : null),
      currentCompany: settingsObj.currentCompany || (parsedObj.currentCompany as string) || null,
      currentTitle: settingsObj.currentTitle || (parsedObj.currentTitle as string) || null,
      education: Array.isArray(settingsObj.education) && settingsObj.education.length > 0 ? settingsObj.education : (Array.isArray(parsedObj.education) ? parsedObj.education : []),
    };

    return res.json({
      success: true,
      data: { profile: formattedProfile },
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadAndParseResume(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No resume file uploaded' });
    }

    const fileKey = `resumes/${req.user.userId}/${Date.now()}-${req.file.originalname}`;
    const resumeUrl = await uploadFile(fileKey, req.file.buffer, req.file.mimetype);

    const rawText = await extractTextFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Could not extract text from the uploaded resume file' });
    }

    const parsedData = await parseResumeWithGemini(rawText);

    if (!parsedData.fullName) {
      const nameFromFilename = req.file.originalname
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_.]/g, ' ')
        .replace(/\b(resume|cv|image|detailed|pdf|doc|docx|scan|new|updated)\b/gi, '')
        .trim();
      if (nameFromFilename.length >= 3 && nameFromFilename.length <= 40) {
        parsedData.fullName = nameFromFilename;
      }
    }

    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { user_id: req.user.userId },
      select: { settings: true, full_name: true, headline: true, phone: true, location: true },
    });
    if (!parsedData.fullName && existingProfile?.full_name) {
      parsedData.fullName = existingProfile.full_name;
    }

    const existingSettings = (existingProfile?.settings && typeof existingProfile.settings === 'object') ? (existingProfile.settings as Record<string, unknown>) : {};
    const mergedSettings: Prisma.InputJsonValue = {
      ...existingSettings,
      ...(parsedData.currentCompany ? { currentCompany: parsedData.currentCompany } : {}),
      ...(parsedData.currentTitle ? { currentTitle: parsedData.currentTitle } : {}),
      ...(parsedData.education && parsedData.education.length > 0 ? { education: parsedData.education } : {}),
    };

    await prisma.candidateProfile.upsert({
      where: { user_id: req.user.userId },
      create: {
        user_id: req.user.userId,
        full_name: parsedData.fullName,
        headline: parsedData.headline,
        phone: parsedData.phone,
        location: parsedData.location,
        timezone: parsedData.timezone,
        resume_url: resumeUrl,
        raw_resume_text: rawText,
        parsed_resume: (parsedData as unknown as Prisma.InputJsonValue) || {},
        settings: mergedSettings,
      },
      update: {
        resume_url: resumeUrl,
        raw_resume_text: rawText,
        parsed_resume: (parsedData as unknown as Prisma.InputJsonValue) || {},
        settings: mergedSettings,
        ...(parsedData.fullName ? { full_name: parsedData.fullName } : {}),
        ...(parsedData.headline ? { headline: parsedData.headline } : {}),
        ...(parsedData.phone ? { phone: parsedData.phone } : {}),
        ...(parsedData.location ? { location: parsedData.location } : {}),
      },
    });

    return res.json({
      success: true,
      data: {
        rawTextLength: rawText.length,
        rawText,
        resumeUrl,
        profile: parsedData,
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    logger.child('CandidateProfile').error(`Failed to upload and parse resume: ${errMsg}`);
    return next(err);
  }
}

