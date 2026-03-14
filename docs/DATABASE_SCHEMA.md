# Database Schema

All tables must include:

id (uuid)
organization_id
created_at
updated_at

Core Tables:

organizations
- id
- name
- plan
- created_at

users
- id
- organization_id
- email
- role

assessments
- id
- organization_id
- status
- score

risks
- id
- organization_id
- severity
- description

incidents
- id
- organization_id
- severity
- status
- description

audit_logs
- id
- organization_id
- user_id
- action
- entity
- entity_id

vendors
- id
- organization_id
- name
- risk_score

documents
- id
- organization_id
- name
- version

training_courses
- id
- organization_id
- title
- mandatory

questionnaires
- id
- organization_id
- title

responses
- id
- questionnaire_id
- user_id