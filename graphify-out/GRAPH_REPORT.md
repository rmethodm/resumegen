# Graph Report - .  (2026-07-12)

## Corpus Check
- Large corpus: 1256 files · ~755,187 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2391 nodes · 4868 edges · 275 communities (203 shown, 72 thin omitted)
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 947 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- AI Usage Limits & Quotas
- User Model & Plan Tiers
- AI Prompt Building
- Core Models & Test Fixtures
- Resignation Letters
- Console Commands & Scheduled Jobs
- React Form UI Components
- Filament Admin Pages
- Resume Builder & Validation
- Resume Model & Media
- Auth & Profile Controllers
- TypeScript Type Definitions
- Public Portfolio Pages
- Filament Resources
- Database Seeders
- Mailables
- Resume Strength Scoring
- Navigation UI Components
- Career Hub & Articles
- Upgrade Modal & Autocomplete UI
- Resume Editor (Edit.tsx)
- Activity Tracking Middleware
- Skills & Autocomplete Search
- Resume Share Links
- Proofreading & System Events
- Filament List Pages
- Cover Letters & Policy
- Billing Tests
- Public Resume Sharing Tests
- Heatmap & Section Events
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 241
- Community 242
- Community 243
- Community 244
- Community 245
- Community 246
- Community 247
- Community 248
- Community 249
- Community 250
- Community 252
- Community 254

## God Nodes (most connected - your core abstractions)
1. `User` - 561 edges
2. `Resume` - 283 edges
3. `TestCase` - 166 edges
4. `UserLimits` - 91 edges
5. `ResumeShareLink` - 64 edges
6. `Controller` - 62 edges
7. `ResumeThread` - 45 edges
8. `ResumeBuilderTest` - 43 edges
9. `AiPrompts` - 28 edges
10. `ResignationLetter` - 28 edges

## Surprising Connections (you probably didn't know these)
- `SkillsLayoutTest` --references--> `Resume`  [EXTRACTED]
  tests/Feature/SkillsLayoutTest.php → app/Models/Resume.php
- `SkillsLayoutTest` --references--> `User`  [EXTRACTED]
  tests/Feature/SkillsLayoutTest.php → app/Models/User.php
- `Index()` --calls--> `triggerUpgradeModal()`  [EXTRACTED]
  resources/js/Pages/ResumeBuilder/Index.tsx → resources/js/Components/UpgradeModal.tsx
- `AdminImpersonationController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/AdminImpersonationController.php → app/Http/Controllers/Controller.php
- `AiSuggestionController` --inherits--> `Controller`  [EXTRACTED]
  app/Http/Controllers/AiSuggestionController.php → app/Http/Controllers/Controller.php

## Import Cycles
- None detected.

## Communities (275 total, 72 thin omitted)

### Community 0 - "AI Usage Limits & Quotas"
Cohesion: 0.04
Nodes (9): AiUsersPage, AiRequest, BelongsTo, UserLimits, AiUserLimitsTest, TierLimitsTest, UserLimitsAiAdminTest, UserLimitsAiTest (+1 more)

### Community 1 - "User Model & Plan Tiers"
Cohesion: 0.04
Nodes (9): HasMany, User, Authenticatable, Billable, FilamentUser, HasApiTokens, Notifiable, TwoFactorSetupTest (+1 more)

### Community 2 - "AI Prompt Building"
Cohesion: 0.05
Nodes (17): AiPrompts, AiSuggestionController, JsonResponse, Request, CareerCoachController, JsonResponse, Request, Response (+9 more)

### Community 3 - "Core Models & Test Fixtures"
Cohesion: 0.11
Nodes (8): BaseTestCase, RefreshDatabase, AiAdminSchemaTest, AiUsageReportTest, PasswordUpdateTest, ResumeScopeNonSnapshotTest, TestCase, ResumeThumbnailGeneratorTest

### Community 4 - "Resignation Letters"
Cohesion: 0.06
Nodes (11): ResignationLetterTemplates, JsonResponse, Request, Response, ResignationLetterController, BelongsTo, ResignationLetter, ResignationLetterPolicy (+3 more)

### Community 5 - "Console Commands & Scheduled Jobs"
Cohesion: 0.06
Nodes (17): AiCostAlert, CaptureRevenueSnapshot, GenerateTemplateThumbnails, NudgeResumeViewsCommand, NudgeStaleResumesCommand, PruneFlaggedAiText, PruneSystemEvents, SampleResume (+9 more)

### Community 6 - "React Form UI Components"
Cohesion: 0.09
Nodes (13): Checkbox(), DangerButton(), InputError(), InputLabel(), Modal(), PrimaryButton(), SecondaryButton(), Guest() (+5 more)

### Community 7 - "Filament Admin Pages"
Cohesion: 0.06
Nodes (18): AiOverviewPage, AuditPage, ContentPage, GrowthPage, OpsPage, RevenuePage, AdminImpersonationController, RedirectResponse (+10 more)

### Community 8 - "Resume Builder & Validation"
Cohesion: 0.08
Nodes (13): ResumeRules, JsonResponse, RedirectResponse, Request, Response, ResumeBuilderController, DocxGenerator, ResumeCompletionScorer (+5 more)

### Community 9 - "Resume Model & Media"
Cohesion: 0.07
Nodes (9): Builder, Resume, HasMedia, InteractsWithMedia, CompletionScoreTest, ResumeBuilderEditPropsTest, ResumeThumbnailTest, ShareUrlTest (+1 more)

### Community 10 - "Auth & Profile Controllers"
Cohesion: 0.08
Nodes (20): AuthenticatedSessionController, RedirectResponse, Request, Response, RedirectResponse, Request, Response, ProfileController (+12 more)

### Community 11 - "TypeScript Type Definitions"
Cohesion: 0.05
Nodes (41): ApplicationContact, AtsScore, AtsScoreCategory, CertEntry, Contact, CoverLetter, CoverLetterRow, CoverLetterSuggestion (+33 more)

### Community 12 - "Public Portfolio Pages"
Cohesion: 0.06
Nodes (27): QRCodeDisplay(), PublicLayout(), Article, CATEGORY_COLORS, Props, ArticleFull, CATEGORY_COLORS, Props (+19 more)

### Community 13 - "Filament Resources"
Cohesion: 0.10
Nodes (8): AdminStatsOverview, JobRole, JobTitle, BelongsTo, PortfolioMessage, BaseWidget, HasFactory, Model

### Community 14 - "Database Seeders"
Cohesion: 0.09
Nodes (12): AiModelRatesSeeder, DatabaseSeeder, DemoDataSeeder, Carbon, JobRolesSeeder, JobSkillsSeeder, JobTitlesSeeder, TestAnalyticsDataSeeder (+4 more)

### Community 15 - "Mailables"
Cohesion: 0.12
Nodes (16): NewPortfolioMessageMail, Content, Envelope, Content, Envelope, ResumeViewNudgeMail, Content, Envelope (+8 more)

### Community 16 - "Resume Strength Scoring"
Cohesion: 0.17
Nodes (5): JsonResponse, Request, StrengthScoreController, ResumeStrengthScorer, ResumeStrengthScorerTest

### Community 17 - "Navigation UI Components"
Cohesion: 0.09
Nodes (9): Dropdown(), DropDownContext, useDarkMode(), NAV, Authenticated(), Props, SortKey, Props (+1 more)

### Community 18 - "Career Hub & Articles"
Cohesion: 0.11
Nodes (5): CareerHubController, Response, CareerArticle, FilamentAdminTest, CareerHubTest

### Community 19 - "Upgrade Modal & Autocomplete UI"
Cohesion: 0.10
Nodes (19): AutocompleteInput(), Props, Suggestion, FEATURE_LABELS, FeatureGate, TIER_NAMES, TIER_PRICES, triggerUpgradeModal() (+11 more)

### Community 20 - "Resume Editor (Edit.tsx)"
Cohesion: 0.13
Nodes (15): DEFAULT_FONT_SIZES, DEFAULT_SECTION_ORDER, Edit(), emptyCert(), emptyContact(), emptyEdu(), emptyExp(), emptyProject() (+7 more)

### Community 21 - "Activity Tracking Middleware"
Cohesion: 0.14
Nodes (8): Closure, Request, Response, TrackActivity, BelongsTo, UserActivityDay, GrowthReport, Carbon

### Community 22 - "Skills & Autocomplete Search"
Cohesion: 0.20
Nodes (5): SkillCategories, AutocompleteController, JsonResponse, Request, SkillCategoriesTest

### Community 23 - "Resume Share Links"
Cohesion: 0.13
Nodes (6): BelongsTo, HasMany, ResumeShareLink, ResumeShareLinkPolicy, OgImageTest, ResumeShareEventTest

### Community 24 - "Proofreading & System Events"
Cohesion: 0.12
Nodes (6): BelongsTo, ProofreadingRequest, SystemEvent, AppServiceProvider, ServiceProvider, ProofreadingTest

### Community 25 - "Filament List Pages"
Cohesion: 0.14
Nodes (8): ListCareerArticles, ListJobRoles, ListJobSkills, ListJobTitles, ListPortfolioMessages, ListProofreadingRequests, ListUsers, ListRecords

### Community 26 - "Cover Letters & Policy"
Cohesion: 0.16
Nodes (4): CoverLetter, BelongsTo, CoverLetterPolicy, CoverLetterTest

### Community 29 - "Heatmap & Section Events"
Cohesion: 0.13
Nodes (6): HeatmapController, Request, Response, BelongsTo, ResumeSectionEvent, HeatmapTest

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (8): NewThreadStarted, Content, Envelope, NewVisitorReply, Content, Envelope, BelongsTo, ResumeThreadMessage

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (5): BelongsTo, Request, ResumeShareEvent, AnalyticsControllerTest, ActivityTest

### Community 32 - "Community 32"
Cohesion: 0.16
Nodes (3): PDF, AnalyticsTest, ViewCountBadgeTest

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (6): RedirectResponse, Request, ResumeTagController, BelongsTo, ResumeTag, ResumeTagTest

### Community 34 - "Community 34"
Cohesion: 0.16
Nodes (5): BelongsTo, HasMany, ResumeThread, ApiTestCase, ThreadReplyApiTest

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (6): EditCareerArticle, EditJobRole, EditJobSkill, EditJobTitle, EditUser, EditRecord

### Community 38 - "Community 38"
Cohesion: 0.16
Nodes (7): AdminAuditLogFactory, ApplicationContactFactory, CoverLetterFactory, JobSkillFactory, ResignationLetterFactory, WebhookEndpointFactory, Factory

### Community 39 - "Community 39"
Cohesion: 0.25
Nodes (5): AiDisabledException, ModerationException, ClientFake, Exception, AiServiceFlaggedTextTest

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (9): Index(), JobApplicationOpt, Props, SortKey, TAG_COLORS, ExtractResult, ImportedData, LINKEDIN_STEPS (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.26
Nodes (4): CoverLetterTemplates, CoverLetterController, Request, Response

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (8): RedirectResponse, Request, TwoFactorRecoveryCodesController, RedirectResponse, VerifyEmailController, Controller, AuthorizesRequests, EmailVerificationRequest

### Community 45 - "Community 45"
Cohesion: 0.23
Nodes (5): DeliverWebhook, BelongsTo, WebhookEndpoint, Dispatchable, InteractsWithQueue

### Community 47 - "Community 47"
Cohesion: 0.27
Nodes (6): CreateCareerArticle, CreateJobRole, CreateJobSkill, CreateJobTitle, CreateUser, CreateRecord

### Community 48 - "Community 48"
Cohesion: 0.36
Nodes (5): JsonResponse, RedirectResponse, Request, Response, PortfolioController

### Community 50 - "Community 50"
Cohesion: 0.24
Nodes (3): CareerCoachMessage, BelongsTo, CareerCoachMessageTest

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (3): OrganizationFactory, PortfolioMessageFactory, AiServiceTest

### Community 59 - "Community 59"
Cohesion: 0.31
Nodes (4): SalaryRanges, JsonResponse, Request, SalaryController

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (4): MessageResource, Form, Infolist, Table

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (4): Form, Infolist, Table, ProofreadingRequestResource

### Community 62 - "Community 62"
Cohesion: 0.44
Nodes (4): BillingController, RedirectResponse, Request, Response

### Community 63 - "Community 63"
Cohesion: 0.44
Nodes (4): RedirectResponse, Request, Response, ResumeThreadController

### Community 67 - "Community 67"
Cohesion: 0.36
Nodes (4): JobRoleResource, Form, Table, Resource

### Community 68 - "Community 68"
Cohesion: 0.50
Nodes (4): RedirectResponse, Request, Response, TwoFactorChallengeController

### Community 69 - "Community 69"
Cohesion: 0.36
Nodes (6): OverQuota, useAiSuggestion(), xsrfToken(), Edit(), Props, ResumeOpt

### Community 71 - "Community 71"
Cohesion: 0.38
Nodes (3): CareerArticleResource, Form, Table

### Community 72 - "Community 72"
Cohesion: 0.38
Nodes (3): JobSkillResource, Form, Table

### Community 73 - "Community 73"
Cohesion: 0.38
Nodes (3): JobTitleResource, Form, Table

### Community 74 - "Community 74"
Cohesion: 0.38
Nodes (3): Form, Table, UserResource

### Community 75 - "Community 75"
Cohesion: 0.43
Nodes (4): ConfirmablePasswordController, RedirectResponse, Request, Response

### Community 76 - "Community 76"
Cohesion: 0.48
Nodes (4): NewPasswordController, RedirectResponse, Request, Response

### Community 77 - "Community 77"
Cohesion: 0.43
Nodes (4): PasswordResetLinkController, RedirectResponse, Request, Response

### Community 78 - "Community 78"
Cohesion: 0.43
Nodes (4): RedirectResponse, Request, Response, RegisteredUserController

### Community 79 - "Community 79"
Cohesion: 0.48
Nodes (4): MessagesController, RedirectResponse, Request, Response

### Community 80 - "Community 80"
Cohesion: 0.48
Nodes (4): PersonalTokenController, JsonResponse, Request, Response

### Community 81 - "Community 81"
Cohesion: 0.48
Nodes (4): RedirectResponse, Request, Response, ProofreadingController

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (6): ANNUAL_PRICE, BillingIndex(), PLAN_AI_FEATURES, PLAN_FEATURES, planFeatures(), Props

### Community 90 - "Community 90"
Cohesion: 0.53
Nodes (4): EmailVerificationPromptController, RedirectResponse, Request, Response

### Community 91 - "Community 91"
Cohesion: 0.60
Nodes (3): RedirectResponse, Request, TwoFactorController

### Community 92 - "Community 92"
Cohesion: 0.60
Nodes (3): RedirectResponse, Request, PublicThreadController

### Community 93 - "Community 93"
Cohesion: 0.53
Nodes (3): RedirectResponse, Request, ResumePhotoController

### Community 95 - "Community 95"
Cohesion: 0.53
Nodes (4): EnsureAiEnabled, Closure, Request, Response

### Community 96 - "Community 96"
Cohesion: 0.53
Nodes (4): EnsureTwoFactorSetup, Closure, Request, Response

### Community 97 - "Community 97"
Cohesion: 0.53
Nodes (3): HandleInertiaRequests, Request, Middleware

### Community 98 - "Community 98"
Cohesion: 0.53
Nodes (4): Closure, Request, Response, RequiresTwoFactorChallenge

### Community 99 - "Community 99"
Cohesion: 0.47
Nodes (3): Content, Envelope, VisitorThreadReply

### Community 102 - "Community 102"
Cohesion: 0.47
Nodes (5): CareerCoachIndex(), CareerCoachIndexProps, CoachMessage, csrfToken(), formatTime()

### Community 104 - "Community 104"
Cohesion: 0.40
Nodes (5): formatSection(), Heatmap(), HeatmapSection, Props, SECTION_LABELS

### Community 111 - "Community 111"
Cohesion: 0.60
Nodes (3): ViewPortfolioMessage, ViewProofreadingRequest, ViewRecord

### Community 112 - "Community 112"
Cohesion: 0.60
Nodes (3): AnalyticsController, Request, Response

### Community 113 - "Community 113"
Cohesion: 0.60
Nodes (3): ActivityController, JsonResponse, Request

### Community 114 - "Community 114"
Cohesion: 0.60
Nodes (3): JsonResponse, Request, ThreadReplyController

### Community 115 - "Community 115"
Cohesion: 0.60
Nodes (3): ConfirmedTwoFactorController, RedirectResponse, Request

### Community 116 - "Community 116"
Cohesion: 0.60
Nodes (3): EmailVerificationNotificationController, RedirectResponse, Request

### Community 117 - "Community 117"
Cohesion: 0.60
Nodes (3): PasswordController, RedirectResponse, Request

### Community 120 - "Community 120"
Cohesion: 0.60
Nodes (3): JsonResponse, Request, SectionEventController

### Community 121 - "Community 121"
Cohesion: 0.60
Nodes (3): AdminPanelProvider, Panel, PanelProvider

### Community 122 - "Community 122"
Cohesion: 0.60
Nodes (4): emptyNarrative(), Props, SkillNarrativeEditor(), uid()

### Community 123 - "Community 123"
Cohesion: 0.50
Nodes (4): formatDate(), MessagesIndex(), Props, ThreadRow

### Community 124 - "Community 124"
Cohesion: 0.40
Nodes (3): Props, ResumeOpt, STATUS_LABEL

### Community 125 - "Community 125"
Cohesion: 0.50
Nodes (4): formatTime(), Message, Thread(), ThreadProps

### Community 126 - "Community 126"
Cohesion: 0.40
Nodes (3): PLATFORMS, Props, SocialLink

### Community 138 - "Community 138"
Cohesion: 0.67
Nodes (3): fallbackCopy(), Props, SharePopover()

### Community 141 - "Community 141"
Cohesion: 0.50
Nodes (3): @inertiajs/core, PageProps, Window

## Knowledge Gaps
- **138 isolated node(s):** `Suggestion`, `Props`, `Props`, `DropDownContext`, `Props` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **72 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User Model & Plan Tiers` to `AI Usage Limits & Quotas`, `AI Prompt Building`, `Core Models & Test Fixtures`, `Resignation Letters`, `Console Commands & Scheduled Jobs`, `Filament Admin Pages`, `Resume Builder & Validation`, `Resume Model & Media`, `Auth & Profile Controllers`, `Filament Resources`, `Database Seeders`, `Mailables`, `Career Hub & Articles`, `Activity Tracking Middleware`, `Resume Share Links`, `Proofreading & System Events`, `Cover Letters & Policy`, `Billing Tests`, `Public Resume Sharing Tests`, `Heatmap & Section Events`, `Community 30`, `Community 31`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 64`, `Community 66`, `Community 70`, `Community 78`, `Community 84`, `Community 85`, `Community 86`, `Community 87`, `Community 88`, `Community 89`, `Community 105`, `Community 106`, `Community 107`, `Community 108`, `Community 109`, `Community 110`, `Community 127`, `Community 128`, `Community 129`, `Community 130`, `Community 131`, `Community 132`, `Community 133`, `Community 134`, `Community 135`, `Community 142`, `Community 143`, `Community 144`, `Community 147`, `Community 148`, `Community 247`, `Community 248`, `Community 249`, `Community 250`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Why does `Resume` connect `Resume Model & Media` to `Community 128`, `User Model & Plan Tiers`, `AI Prompt Building`, `Core Models & Test Fixtures`, `Resignation Letters`, `Console Commands & Scheduled Jobs`, `Community 131`, `Filament Admin Pages`, `Resume Builder & Validation`, `Community 132`, `Community 133`, `Community 134`, `Filament Resources`, `Database Seeders`, `Mailables`, `Resume Strength Scoring`, `Community 144`, `Community 146`, `Community 149`, `Community 150`, `Resume Share Links`, `Heatmap & Section Events`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 41`, `Community 42`, `Community 46`, `Community 52`, `Community 57`, `Community 63`, `Community 64`, `Community 66`, `Community 82`, `Community 86`, `Community 87`, `Community 89`, `Community 93`, `Community 94`, `Community 99`, `Community 106`, `Community 110`, `Community 112`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `Controller` connect `Community 44` to `AI Prompt Building`, `Resignation Letters`, `Console Commands & Scheduled Jobs`, `Filament Admin Pages`, `Resume Builder & Validation`, `Auth & Profile Controllers`, `Resume Strength Scoring`, `Career Hub & Articles`, `Skills & Autocomplete Search`, `Heatmap & Section Events`, `Community 33`, `Community 43`, `Community 48`, `Community 59`, `Community 62`, `Community 63`, `Community 68`, `Community 75`, `Community 76`, `Community 77`, `Community 78`, `Community 79`, `Community 80`, `Community 81`, `Community 90`, `Community 91`, `Community 92`, `Community 93`, `Community 94`, `Community 112`, `Community 113`, `Community 114`, `Community 115`, `Community 116`, `Community 117`, `Community 118`, `Community 119`, `Community 120`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 457 inferred relationships involving `User` (e.g. with `.handle()` and `.handle()`) actually correct?**
  _`User` has 457 INFERRED edges - model-reasoned connections that need verification._
- **Are the 176 inferred relationships involving `Resume` (e.g. with `.getHeaderActions()` and `.getViewData()`) actually correct?**
  _`Resume` has 176 INFERRED edges - model-reasoned connections that need verification._
- **Are the 65 inferred relationships involving `UserLimits` (e.g. with `.getViewData()` and `.atsKeywords()`) actually correct?**
  _`UserLimits` has 65 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Suggestion`, `Props`, `Props` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._