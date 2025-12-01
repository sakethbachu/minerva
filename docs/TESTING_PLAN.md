# Testing Implementation Plan

## Overview
This document outlines the complete testing strategy before any code changes are made. Review and approve each section before implementation.

---

## 1. Testing Strategy Decisions

### 1.1 Test Types to Implement
- [ ] **Unit Tests** (Python + TypeScript)
  - Python: Models, services, utility functions
  - TypeScript: Question generator, session management
  
- [ ] **Integration Tests**
  - Express → Python service communication
  - API endpoint testing (both services)
  
- [ ] **Build & Launch Verification**
  - TypeScript compilation
  - Service startup checks
  - Health endpoint verification
  
- [ ] **E2E Tests** (Optional - Phase 2)
  - Full user flow testing
  - Browser automation

### 1.2 Test Framework Choices
- [ ] **Python**: `pytest` ✅ (confirmed)
- [ ] **TypeScript/Node**: 
  - Option A: `jest` (most popular, well-documented)
  - Option B: `vitest` (faster, modern)
  - Option C: `mocha` + `chai` (traditional)
  - **Decision needed**: Which one?

### 1.3 E2E Testing Approach
- [ ] **Option A**: Implement Playwright (comprehensive, modern)
- [ ] **Option B**: Implement Puppeteer (simpler, Chrome-only)
- [ ] **Option C**: Skip E2E for now (Phase 2)
- **Decision needed**: Which approach?

---

## 2. Directory Structure

### 2.1 Proposed Structure
```
minerva/
├── python-service/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py (pytest fixtures)
│   │   ├── unit/
│   │   │   ├── test_models_question.py
│   │   │   ├── test_models_search.py
│   │   │   ├── test_question_generator.py
│   │   │   └── test_search_service.py
│   │   └── integration/
│   │       └── test_api_endpoints.py
│
├── tests/  (root level)
│   ├── e2e/  (if implementing E2E)
│   │   └── test_full_flow.spec.ts
│   ├── integration/
│   │   └── test_service_communication.ts
│   └── build/
│       └── test_build_and_launch.sh
│
└── .github/
    └── workflows/
        └── ci.yml
```

**Decision needed**: Does this structure work for you?

---

## 3. What to Mock

### 3.1 External Services to Mock
- [ ] **OpenAI API** (question generation)
- [ ] **Groq API** (search with MCP)
- [ ] **Tavily API** (search service)
- [ ] **E2B Sandbox** (code execution)
- [ ] **Google Gemini API** (if used)
- [ ] **HTTP calls** between Express and Python service

### 3.2 Mocking Strategy
- [ ] Use `pytest-mock` for Python
- [ ] Use `nock` or `msw` for TypeScript
- [ ] Create reusable mock fixtures
- [ ] Store sample API responses as fixtures

**Decision needed**: Any other external dependencies to mock?

---

## 4. Environment Variables & Configuration

### 4.1 Test Environment Setup
- [ ] Create `python-service/.env.test` for test config
- [ ] Use test-specific API keys (or mock all APIs)
- [ ] Handle missing env vars gracefully in tests
- [ ] Document required env vars for local testing

### 4.2 GitHub Actions Secrets
- [ ] Decide if we need real API keys for integration tests
- [ ] Or: Mock all external APIs (recommended for CI)
- [ ] Plan for optional E2E tests that might need real services

**Decision needed**: Mock everything or use test API keys?

---

## 5. Critical Test Cases

### 5.1 Question Generation Flow
- [ ] Valid query → generates questions
- [ ] Invalid query → error handling
- [ ] OpenAI API failure → retry logic
- [ ] Validation errors → proper error messages
- [ ] Response format validation

### 5.2 Search Flow
- [ ] Valid search request → returns results
- [ ] Python service down → error handling
- [ ] Search API failures → retry logic
- [ ] Result parsing and enrichment
- [ ] Empty results handling

### 5.3 Session Management
- [ ] Session creation
- [ ] Session retrieval
- [ ] Invalid session handling
- [ ] Answer storage and retrieval

### 5.4 Error Handling
- [ ] Missing environment variables
- [ ] Invalid API responses
- [ ] Network timeouts
- [ ] Service unavailable
- [ ] Invalid input validation

**Decision needed**: Any other critical paths to test?

---

## 6. GitHub Actions Workflow

### 6.1 Workflow Structure
```yaml
name: CI

on:
  pull_request:
    branches: [main, backend-dev]
  push:
    branches: [main, backend-dev]

jobs:
  lint:
    - Python: ruff, mypy
    - TypeScript: (if we add ESLint)
  
  test-python:
    - Unit tests
    - Integration tests
    - Coverage report
  
  test-typescript:
    - Unit tests (if implemented)
    - Integration tests
  
  build-verify:
    - Build TypeScript
    - Start Python service
    - Start Express service
    - Health check both
  
  e2e: (optional)
    - Full flow test
```

### 6.2 Workflow Decisions
- [ ] **Triggers**: On PR, on push, or both?
- [ ] **Matrix testing**: Test multiple Python/Node versions?
- [ ] **Parallel jobs**: Run tests in parallel?
- [ ] **Artifacts**: Save coverage reports, test results?
- [ ] **Notifications**: Comment on PR with test results?

**Decision needed**: What triggers and features do you want?

---

## 7. Build & Launch Verification

### 7.1 Build Checks
- [ ] TypeScript compiles without errors
- [ ] No missing dependencies
- [ ] Python imports resolve correctly
- [ ] All required files present

### 7.2 Launch Checks
- [ ] Python service starts on port 8000
- [ ] Express service starts on port 3001
- [ ] Health endpoints respond
- [ ] Services can communicate
- [ ] Ports are available

### 7.3 Implementation Approach
- [ ] Option A: Shell script that starts services and checks
- [ ] Option B: GitHub Actions job that starts services
- [ ] Option C: Both (script for local, Actions for CI)

**Decision needed**: Which approach?

---

## 8. Coverage Reporting

### 8.1 Coverage Goals
- [ ] Target coverage percentage (e.g., 80%?)
- [ ] Which files to exclude (tests, __pycache__, etc.)
- [ ] Coverage for Python only, or TypeScript too?

### 8.2 Coverage Display
- [ ] Generate HTML reports (local viewing)
- [ ] Generate XML reports (for CI)
- [ ] Comment on PRs with coverage (optional)
- [ ] Fail CI if coverage drops below threshold

**Decision needed**: Coverage goals and display preferences?

---

## 9. Test Execution Strategy

### 9.1 Test Order
1. Linting (fastest, fail fast)
2. Unit tests (fast, isolated)
3. Integration tests (slower, dependencies)
4. Build verification (fast)
5. E2E tests (slowest, optional)

### 9.2 Parallelization
- [ ] Run Python and TypeScript tests in parallel
- [ ] Run unit tests in parallel
- [ ] Run integration tests sequentially (shared resources)

**Decision needed**: Any constraints on parallel execution?

---

## 10. Documentation

### 10.1 Test Documentation Needed
- [ ] README section on running tests locally
- [ ] Test structure explanation
- [ ] How to add new tests
- [ ] Mocking guide
- [ ] Troubleshooting guide

**Decision needed**: What documentation is most important?

---

## 11. Phase Implementation Plan

### Phase 1 (Essential - Start Here)
1. ✅ Python unit tests (models, core logic)
2. ✅ Python API endpoint tests
3. ✅ Build verification script
4. ✅ Basic GitHub Actions workflow
5. ✅ Coverage reporting setup

### Phase 2 (Important - After Phase 1)
1. Integration tests (service-to-service)
2. TypeScript/Node tests
3. Enhanced error handling tests
4. Coverage threshold enforcement

### Phase 3 (Nice to Have - Future)
1. E2E tests with Playwright
2. Performance tests
3. Load testing
4. Visual regression tests

**Decision needed**: Start with Phase 1, or include Phase 2 items?

---

## 12. Open Questions & Decisions Needed

### Immediate Decisions Required:
1. **TypeScript test framework**: jest, vitest, or mocha?
2. **E2E testing**: Playwright, Puppeteer, or skip for now?
3. **Mocking strategy**: Mock all APIs or use test keys?
4. **GitHub Actions triggers**: PR only, or also on push?
5. **Coverage threshold**: What percentage to target?
6. **Build verification**: Script, Actions job, or both?
7. **Phase scope**: Phase 1 only, or include Phase 2?

### Nice to Have (Can Decide Later):
- Matrix testing (multiple Python/Node versions)
- Test result comments on PRs
- Performance benchmarks
- Load testing

---

## Next Steps

1. **Review this plan** - Check all sections
2. **Make decisions** - Answer open questions above
3. **Approve structure** - Confirm directory layout
4. **Prioritize** - What's most important to test first?
5. **Start implementation** - Begin with Phase 1

---

## Notes

- All tools are free (GitHub Actions free tier, open-source tools)
- Focus on fast feedback (unit tests first)
- Make tests maintainable (good fixtures, clear structure)
- Keep CI fast (parallel jobs, skip slow tests on draft PRs)


