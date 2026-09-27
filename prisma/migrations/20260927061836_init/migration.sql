-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR', 'SALES_ADVISOR', 'CONTRACTOR', 'CLIENT');

-- CreateEnum
CREATE TYPE "EvidenceState" AS ENUM ('VERIFIED', 'CLIENT_PROVIDED', 'ASSUMPTION', 'NOT_VERIFIED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('WEBSITE_OBSERVATION', 'SCREENSHOT', 'CLIENT_STATEMENT', 'DOCUMENT', 'ANALYTICS_EXPORT', 'CALL_NOTE', 'THIRD_PARTY_LISTING', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('TARGET', 'CONTACTED', 'CONVERSATION', 'QUALIFIED', 'DIAGNOSTIC', 'PRESCRIPTION_PENDING', 'PROPOSAL', 'WON', 'LOST', 'DEFERRED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "QualificationState" AS ENUM ('UNASSESSED', 'IN_PROGRESS', 'QUALIFIED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "DemandSourceState" AS ENUM ('UNKNOWN', 'NONE', 'WEAK', 'MEANINGFUL');

-- CreateEnum
CREATE TYPE "AuthorityState" AS ENUM ('UNKNOWN', 'PARTIAL', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AuthorityLevel" AS ENUM ('UNKNOWN', 'DECISION_MAKER', 'INFLUENCER', 'GATEKEEPER');

-- CreateEnum
CREATE TYPE "DecisionRole" AS ENUM ('UNKNOWN', 'ECONOMIC_BUYER', 'CHAMPION', 'TECHNICAL_EVALUATOR', 'END_USER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PRIMARY', 'TEST', 'POST_SALE', 'DEFERRED', 'RETIRED');

-- CreateEnum
CREATE TYPE "OfferValidationState" AS ENUM ('TESTING', 'VALIDATED');

-- CreateEnum
CREATE TYPE "QaStatus" AS ENUM ('NOT_READY', 'READY_FOR_QA', 'QA_FAILED', 'QA_PASSED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "SectionStatus" AS ENUM ('NOT_STARTED', 'DRAFT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ValidationDecisionState" AS ENUM ('DOUBLE', 'TWEAK', 'PAUSE', 'KILL');

-- CreateEnum
CREATE TYPE "ConfidenceDimension" AS ENUM ('DEMAND', 'WILLINGNESS_TO_PAY', 'DELIVERY', 'OUTCOME', 'RECURRING_VALUE');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "HypothesisStatus" AS ENUM ('DRAFT', 'RUNNING', 'CONCLUDED');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('OUTCOME', 'AVERAGE', 'MARGIN', 'SPEED', 'TESTIMONIAL', 'BENCHMARK');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'VERIFIED', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATE_CHANGE', 'SCORE_CHANGE', 'EVIDENCE_STATE_CHANGE', 'FINALIZE', 'PUBLISH', 'APPROVE', 'PERMISSION_CHANGE', 'FRAMEWORK_CHANGE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "clientId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "market" TEXT,
    "location" TEXT,
    "businessModel" TEXT,
    "primaryObjective" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "authorityLevel" "AuthorityLevel" NOT NULL DEFAULT 'UNKNOWN',
    "decisionRole" "DecisionRole" NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "status" "OfferStatus" NOT NULL,
    "validationState" "OfferValidationState" NOT NULL DEFAULT 'TESTING',
    "description" TEXT,
    "edition" TEXT,
    "positiveUnitEconomics" BOOLEAN NOT NULL DEFAULT false,
    "unitEconomicsBasis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "offerId" TEXT,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'TARGET',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessObjective" TEXT,
    "problemHypothesis" TEXT,
    "economicContext" TEXT,
    "currentSystems" TEXT,
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'UNKNOWN',
    "authorityState" "AuthorityState" NOT NULL DEFAULT 'UNKNOWN',
    "budgetSignal" TEXT,
    "demandSourceState" "DemandSourceState" NOT NULL DEFAULT 'UNKNOWN',
    "qualificationState" "QualificationState" NOT NULL DEFAULT 'UNASSESSED',
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "disqualificationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenuePeriod" (
    "id" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "cashTarget" DECIMAL(12,2) NOT NULL,
    "collectedToDate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "contractedNearTerm" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "recurringRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avgFirstSaleRevenue" DECIMAL(12,2),
    "decidedProposals" INTEGER NOT NULL DEFAULT 0,
    "wonProposals" INTEGER NOT NULL DEFAULT 0,
    "qualifiedConversations" INTEGER NOT NULL DEFAULT 0,
    "proposalsFromConversations" INTEGER NOT NULL DEFAULT 0,
    "openOpportunityCount" INTEGER NOT NULL DEFAULT 0,
    "openProposalCount" INTEGER NOT NULL DEFAULT 0,
    "founderCapacityHours" DECIMAL(6,1),
    "founderCommittedHours" DECIMAL(6,1),
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenuePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkVersion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "adoptedAt" TIMESTAMP(3),
    "adoptedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringVersion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "rules" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplateVersion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticZoneDefinition" (
    "id" TEXT NOT NULL,
    "frameworkVersionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "DiagnosticZoneDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticSectionDefinition" (
    "id" TEXT NOT NULL,
    "frameworkVersionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "DiagnosticSectionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Diagnostic" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "supersedesId" TEXT,
    "title" TEXT NOT NULL,
    "qaStatus" "QaStatus" NOT NULL DEFAULT 'NOT_READY',
    "frameworkVersionId" TEXT NOT NULL,
    "scoringVersionId" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "reportTemplateVersionId" TEXT,
    "intakeObjective" TEXT,
    "intakeWebsiteUrl" TEXT,
    "intakeCurrentSystems" TEXT,
    "intakeDemandSources" TEXT,
    "intakeCompletedAt" TIMESTAMP(3),
    "executiveDiagnosis" TEXT,
    "revenueSpineStrength" TEXT,
    "biggestConstraint" TEXT,
    "recommendedInterventionDirection" TEXT,
    "implementationReadiness" TEXT,
    "measurementPlan" TEXT,
    "nextDecision" TEXT,
    "finalRecommendation" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "diagnosticId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "capturedText" TEXT,
    "fileRef" TEXT,
    "evidenceState" "EvidenceState" NOT NULL DEFAULT 'NOT_VERIFIED',
    "operatorNotes" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedById" TEXT NOT NULL,
    "stateChangedAt" TIMESTAMP(3),
    "stateChangeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneScore" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "zoneDefinitionId" TEXT NOT NULL,
    "score" INTEGER,
    "diagnosis" TEXT,
    "primaryWeakness" TEXT,
    "recommendedInterventionClass" TEXT,
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'LOW',
    "justification" TEXT,
    "scoringVersionId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoneScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneScoreEvidence" (
    "zoneScoreId" TEXT NOT NULL,
    "evidenceItemId" TEXT NOT NULL,

    CONSTRAINT "ZoneScoreEvidence_pkey" PRIMARY KEY ("zoneScoreId","evidenceItemId")
);

-- CreateTable
CREATE TABLE "SectionResult" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "sectionDefinitionId" TEXT NOT NULL,
    "status" "SectionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "findingsSummary" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionResultEvidence" (
    "sectionResultId" TEXT NOT NULL,
    "evidenceItemId" TEXT NOT NULL,

    CONSTRAINT "SectionResultEvidence_pkey" PRIMARY KEY ("sectionResultId","evidenceItemId")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "sectionResultId" TEXT,
    "statement" TEXT NOT NULL,
    "isMaterial" BOOLEAN NOT NULL DEFAULT true,
    "evidenceState" "EvidenceState" NOT NULL DEFAULT 'NOT_VERIFIED',
    "clientFacing" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FindingEvidence" (
    "findingId" TEXT NOT NULL,
    "evidenceItemId" TEXT NOT NULL,

    CONSTRAINT "FindingEvidence_pkey" PRIMARY KEY ("findingId","evidenceItemId")
);

-- CreateTable
CREATE TABLE "RevenueLeakScenario" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "averageClientValue" DECIMAL(12,2),
    "averageClientValueState" "EvidenceState" NOT NULL DEFAULT 'NOT_VERIFIED',
    "missedBookingsPerWeek" DECIMAL(8,2),
    "missedBookingsState" "EvidenceState" NOT NULL DEFAULT 'NOT_VERIFIED',
    "weeksPerMonth" DECIMAL(4,2) NOT NULL DEFAULT 4,
    "weeksPerMonthState" "EvidenceState" NOT NULL DEFAULT 'ASSUMPTION',
    "estimatedMonthlyExposure" DECIMAL(12,2),
    "resultState" "EvidenceState" NOT NULL DEFAULT 'NOT_VERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueLeakScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorityFix" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "problem" TEXT NOT NULL,
    "fix" TEXT NOT NULL,
    "interventionClass" TEXT,
    "zoneKey" TEXT,
    "effort" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriorityFix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriorityFixEvidence" (
    "priorityFixId" TEXT NOT NULL,
    "evidenceItemId" TEXT NOT NULL,

    CONSTRAINT "PriorityFixEvidence_pkey" PRIMARY KEY ("priorityFixId","evidenceItemId")
);

-- CreateTable
CREATE TABLE "QaRun" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "runById" TEXT NOT NULL,
    "resultStatus" "QaStatus" NOT NULL,
    "checks" JSONB NOT NULL,
    "attestations" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientReport" (
    "id" TEXT NOT NULL,
    "diagnosticId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB,
    "frameworkVersionId" TEXT NOT NULL,
    "scoringVersionId" TEXT NOT NULL,
    "promptVersionId" TEXT,
    "reportTemplateVersionId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "offerId" TEXT,
    "icp" TEXT NOT NULL,
    "pain" TEXT NOT NULL,
    "proposedIntervention" TEXT NOT NULL,
    "offer" TEXT NOT NULL,
    "priceScope" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "expectedBehavior" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sampleTarget" INTEGER,
    "successThreshold" TEXT,
    "killCondition" TEXT,
    "status" "HypothesisStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationTest" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "sampleSizeTarget" INTEGER NOT NULL,
    "outreachCount" INTEGER NOT NULL DEFAULT 0,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "qualifiedConversations" INTEGER NOT NULL DEFAULT 0,
    "commercialAsks" INTEGER NOT NULL DEFAULT 0,
    "advancedToNextStep" INTEGER NOT NULL DEFAULT 0,
    "paidEngagements" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationEvidence" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "buyerLanguage" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "objections" TEXT,
    "paymentEvent" BOOLEAN NOT NULL DEFAULT false,
    "paymentAmount" DECIMAL(12,2),
    "source" TEXT NOT NULL,
    "evidenceState" "EvidenceState" NOT NULL DEFAULT 'NOT_VERIFIED',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationDecision" (
    "id" TEXT NOT NULL,
    "hypothesisId" TEXT NOT NULL,
    "decision" "ValidationDecisionState" NOT NULL,
    "rationale" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferConfidence" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "dimension" "ConfidenceDimension" NOT NULL,
    "level" "ConfidenceLevel" NOT NULL DEFAULT 'LOW',
    "basis" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferConfidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingClaim" (
    "id" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL,
    "isQuantitative" BOOLEAN NOT NULL DEFAULT false,
    "cohortDefinition" TEXT,
    "timeWindow" TEXT,
    "calculationMethod" TEXT,
    "ownerId" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvidence" (
    "claimId" TEXT NOT NULL,
    "evidenceItemId" TEXT NOT NULL,

    CONSTRAINT "ClaimEvidence_pkey" PRIMARY KEY ("claimId","evidenceItemId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_name_key" ON "Offer"("name");

-- CreateIndex
CREATE INDEX "Opportunity_clientId_idx" ON "Opportunity"("clientId");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_nextActionDate_idx" ON "Opportunity"("nextActionDate");

-- CreateIndex
CREATE UNIQUE INDEX "RevenuePeriod_periodStart_key" ON "RevenuePeriod"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkVersion_code_key" ON "FrameworkVersion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringVersion_code_key" ON "ScoringVersion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_code_key" ON "PromptVersion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReportTemplateVersion_code_key" ON "ReportTemplateVersion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticZoneDefinition_frameworkVersionId_key_key" ON "DiagnosticZoneDefinition"("frameworkVersionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticZoneDefinition_frameworkVersionId_position_key" ON "DiagnosticZoneDefinition"("frameworkVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticSectionDefinition_frameworkVersionId_number_key" ON "DiagnosticSectionDefinition"("frameworkVersionId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticSectionDefinition_frameworkVersionId_key_key" ON "DiagnosticSectionDefinition"("frameworkVersionId", "key");

-- CreateIndex
CREATE INDEX "Diagnostic_clientId_idx" ON "Diagnostic"("clientId");

-- CreateIndex
CREATE INDEX "Diagnostic_qaStatus_idx" ON "Diagnostic"("qaStatus");

-- CreateIndex
CREATE INDEX "EvidenceItem_clientId_idx" ON "EvidenceItem"("clientId");

-- CreateIndex
CREATE INDEX "EvidenceItem_diagnosticId_idx" ON "EvidenceItem"("diagnosticId");

-- CreateIndex
CREATE INDEX "EvidenceItem_evidenceState_idx" ON "EvidenceItem"("evidenceState");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneScore_diagnosticId_zoneDefinitionId_key" ON "ZoneScore"("diagnosticId", "zoneDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionResult_diagnosticId_sectionDefinitionId_key" ON "SectionResult"("diagnosticId", "sectionDefinitionId");

-- CreateIndex
CREATE INDEX "Finding_diagnosticId_idx" ON "Finding"("diagnosticId");

-- CreateIndex
CREATE INDEX "RevenueLeakScenario_diagnosticId_idx" ON "RevenueLeakScenario"("diagnosticId");

-- CreateIndex
CREATE UNIQUE INDEX "PriorityFix_diagnosticId_rank_key" ON "PriorityFix"("diagnosticId", "rank");

-- CreateIndex
CREATE INDEX "QaRun_diagnosticId_idx" ON "QaRun"("diagnosticId");

-- CreateIndex
CREATE INDEX "ClientReport_clientId_status_idx" ON "ClientReport"("clientId", "status");

-- CreateIndex
CREATE INDEX "ClientReport_diagnosticId_idx" ON "ClientReport"("diagnosticId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferConfidence_offerId_dimension_key" ON "OfferConfidence"("offerId", "dimension");

-- CreateIndex
CREATE INDEX "MarketingClaim_status_idx" ON "MarketingClaim"("status");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenuePeriod" ADD CONSTRAINT "RevenuePeriod_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkVersion" ADD CONSTRAINT "FrameworkVersion_adoptedById_fkey" FOREIGN KEY ("adoptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticZoneDefinition" ADD CONSTRAINT "DiagnosticZoneDefinition_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSectionDefinition" ADD CONSTRAINT "DiagnosticSectionDefinition_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "Diagnostic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_scoringVersionId_fkey" FOREIGN KEY ("scoringVersionId") REFERENCES "ScoringVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_reportTemplateVersionId_fkey" FOREIGN KEY ("reportTemplateVersionId") REFERENCES "ReportTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diagnostic" ADD CONSTRAINT "Diagnostic_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneScore" ADD CONSTRAINT "ZoneScore_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneScore" ADD CONSTRAINT "ZoneScore_zoneDefinitionId_fkey" FOREIGN KEY ("zoneDefinitionId") REFERENCES "DiagnosticZoneDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneScore" ADD CONSTRAINT "ZoneScore_scoringVersionId_fkey" FOREIGN KEY ("scoringVersionId") REFERENCES "ScoringVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneScoreEvidence" ADD CONSTRAINT "ZoneScoreEvidence_zoneScoreId_fkey" FOREIGN KEY ("zoneScoreId") REFERENCES "ZoneScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneScoreEvidence" ADD CONSTRAINT "ZoneScoreEvidence_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionResult" ADD CONSTRAINT "SectionResult_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionResult" ADD CONSTRAINT "SectionResult_sectionDefinitionId_fkey" FOREIGN KEY ("sectionDefinitionId") REFERENCES "DiagnosticSectionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionResultEvidence" ADD CONSTRAINT "SectionResultEvidence_sectionResultId_fkey" FOREIGN KEY ("sectionResultId") REFERENCES "SectionResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionResultEvidence" ADD CONSTRAINT "SectionResultEvidence_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_sectionResultId_fkey" FOREIGN KEY ("sectionResultId") REFERENCES "SectionResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingEvidence" ADD CONSTRAINT "FindingEvidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FindingEvidence" ADD CONSTRAINT "FindingEvidence_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueLeakScenario" ADD CONSTRAINT "RevenueLeakScenario_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorityFix" ADD CONSTRAINT "PriorityFix_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorityFixEvidence" ADD CONSTRAINT "PriorityFixEvidence_priorityFixId_fkey" FOREIGN KEY ("priorityFixId") REFERENCES "PriorityFix"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriorityFixEvidence" ADD CONSTRAINT "PriorityFixEvidence_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaRun" ADD CONSTRAINT "QaRun_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QaRun" ADD CONSTRAINT "QaRun_runById_fkey" FOREIGN KEY ("runById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "Diagnostic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_frameworkVersionId_fkey" FOREIGN KEY ("frameworkVersionId") REFERENCES "FrameworkVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_scoringVersionId_fkey" FOREIGN KEY ("scoringVersionId") REFERENCES "ScoringVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_promptVersionId_fkey" FOREIGN KEY ("promptVersionId") REFERENCES "PromptVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_reportTemplateVersionId_fkey" FOREIGN KEY ("reportTemplateVersionId") REFERENCES "ReportTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientReport" ADD CONSTRAINT "ClientReport_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hypothesis" ADD CONSTRAINT "Hypothesis_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationTest" ADD CONSTRAINT "ValidationTest_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationEvidence" ADD CONSTRAINT "ValidationEvidence_testId_fkey" FOREIGN KEY ("testId") REFERENCES "ValidationTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationDecision" ADD CONSTRAINT "ValidationDecision_hypothesisId_fkey" FOREIGN KEY ("hypothesisId") REFERENCES "Hypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationDecision" ADD CONSTRAINT "ValidationDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferConfidence" ADD CONSTRAINT "OfferConfidence_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingClaim" ADD CONSTRAINT "MarketingClaim_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingClaim" ADD CONSTRAINT "MarketingClaim_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MarketingClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_evidenceItemId_fkey" FOREIGN KEY ("evidenceItemId") REFERENCES "EvidenceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────── Hand-written integrity constraints (see /docs/DOMAIN_MODEL.md §4) ─────────────

-- S1: scores are 1–10 or null.
ALTER TABLE "ZoneScore" ADD CONSTRAINT "ZoneScore_score_range" CHECK ("score" IS NULL OR ("score" >= 1 AND "score" <= 10));

-- Framework shape: 15 numbered sections, positive zone positions.
ALTER TABLE "DiagnosticSectionDefinition" ADD CONSTRAINT "DiagnosticSectionDefinition_number_range" CHECK ("number" >= 1 AND "number" <= 15);
ALTER TABLE "DiagnosticZoneDefinition" ADD CONSTRAINT "DiagnosticZoneDefinition_position_positive" CHECK ("position" >= 1);
ALTER TABLE "PriorityFix" ADD CONSTRAINT "PriorityFix_rank_positive" CHECK ("rank" >= 1);

-- R-series: funnel counts are coherent (no rate > 100%, no negative inputs).
ALTER TABLE "RevenuePeriod" ADD CONSTRAINT "RevenuePeriod_nonnegative" CHECK (
  "cashTarget" >= 0 AND "collectedToDate" >= 0 AND "contractedNearTerm" >= 0 AND "recurringRevenue" >= 0
  AND ("avgFirstSaleRevenue" IS NULL OR "avgFirstSaleRevenue" > 0)
  AND "decidedProposals" >= 0 AND "wonProposals" >= 0
  AND "qualifiedConversations" >= 0 AND "proposalsFromConversations" >= 0
  AND "openOpportunityCount" >= 0 AND "openProposalCount" >= 0
);
ALTER TABLE "RevenuePeriod" ADD CONSTRAINT "RevenuePeriod_won_le_decided" CHECK ("wonProposals" <= "decidedProposals");
ALTER TABLE "RevenuePeriod" ADD CONSTRAINT "RevenuePeriod_proposals_le_conversations" CHECK ("proposalsFromConversations" <= "qualifiedConversations");

-- R5: leak-scenario inputs are non-negative.
ALTER TABLE "RevenueLeakScenario" ADD CONSTRAINT "RevenueLeakScenario_nonnegative" CHECK (
  ("averageClientValue" IS NULL OR "averageClientValue" >= 0)
  AND ("missedBookingsPerWeek" IS NULL OR "missedBookingsPerWeek" >= 0)
  AND "weeksPerMonth" > 0
);

-- A1: CLIENT users must be bound to a client; internal users must not be.
ALTER TABLE "User" ADD CONSTRAINT "User_client_binding" CHECK (
  ("role" = 'CLIENT' AND "clientId" IS NOT NULL) OR ("role" <> 'CLIENT' AND "clientId" IS NULL)
);

-- AuditLog is append-only at the database level.
CREATE OR REPLACE FUNCTION "audit_log_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_no_update" BEFORE UPDATE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();
CREATE TRIGGER "AuditLog_no_delete" BEFORE DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION "audit_log_append_only"();
