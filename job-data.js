/* ============================================================================
   Kaidostar Job Search - demo job corpus (used when you're not signed in).

   Every company here is fictional. Postings are written to look and read like
   real ones, including the messy parts real boards have: the same job on two
   sites, a job quietly reposted a month later, staffing-agency reposts, "talent
   pool" posts that aren't a real opening, region-locked remote roles, and lines
   like "we are unable to sponsor visas". The engine has to handle all of them
   honestly - so the demo does too.

   Dates are relative (d = days since the employer posted it, dl = days until
   applications close) and become real timestamps when this file loads, so
   freshness and deadlines are always truthful for "now".
   demo:true means there is no live application behind the Apply button.
   ============================================================================ */
(function (root) {
  'use strict';
  var J = [
  // ------------------------------------------------------------ PRODUCT
  { id: 1001, type: 'job', title: 'Associate Product Manager', org: 'Fernway Labs', loc: 'San Francisco, CA (Hybrid)', d: 2, sal: [115000, 135000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/fernwaylabs/jobs/4821301',
    desc: `About Fernway Labs
Fernway Labs builds workflow software for independent pharmacies. We're a 60-person B2B SaaS company backed by Series B investors.

The role
As an Associate Product Manager you'll own a slice of our prescription-refill experience end to end: talking to pharmacists, writing specs, and shipping with a team of five engineers and a designer.

What you'll do
- Run user interviews and usability testing with pharmacists every sprint
- Write clear product requirements and prioritize the backlog in Jira
- Define success metrics and analyze results with SQL
- Design and read A/B tests with our data team

What we're looking for
- 0-2 years of experience in product management, consulting, analytics or a similar role
- Comfortable writing SQL queries to answer your own questions
- Strong written communication and a bias toward talking to customers
- Bachelor's degree or equivalent experience

Nice to have
- Experience with Amplitude or Mixpanel
- Familiarity with healthcare workflows

Compensation: $115,000 - $135,000 base + equity. Hybrid: 3 days a week in our SF office.` },
  { id: 1012, type: 'job', title: 'Associate Product Manager', org: 'Fernway Labs Inc.', loc: 'San Francisco, CA', d: 2, sal: [115000, 135000], src: 'Adzuna', url: 'https://www.adzuna.com/details/4471820931',
    desc: `Fernway Labs builds workflow software for independent pharmacies. As an Associate Product Manager you'll own a slice of our prescription-refill experience end to end. 0-2 years of experience in product management, consulting or analytics. Comfortable writing SQL queries. Run user interviews and A/B tests...` },
  { id: 1002, type: 'job', title: 'Product Manager, Growth', org: 'Twin River', loc: 'Remote (US)', d: 5, sal: [140000, 165000], src: 'Lever', url: 'https://jobs.lever.co/twinriver/8f2c1e70',
    desc: `Twin River is a consumer budgeting app used by 2 million people. We're hiring a Product Manager to lead our activation and retention squad.

Responsibilities
- Own the growth roadmap for onboarding and the first 30 days
- Run a steady cadence of experiments: A/B testing, holdouts, pricing tests
- Partner with data science on funnel analysis in SQL and Amplitude
- Work with lifecycle marketing on email campaigns and push

Requirements
- 3+ years of product management experience, ideally on growth or monetization
- Hands-on experimentation experience - you've designed and read your own tests
- Strong SQL; Python is a plus
- Excellent stakeholder management across engineering, design and marketing

This is a fully remote role open to candidates in the United States. Salary range: $140,000 - $165,000.` },
  { id: 1003, type: 'job', title: 'Senior Product Manager, Payments', org: 'Ledgerline', loc: 'New York, NY (Hybrid)', d: 9, sal: [185000, 215000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/ledgerline/jobs/5502117',
    desc: `About Ledgerline
Ledgerline is a fintech company providing payments infrastructure for mid-market lenders.

What you'll do
- Own the payments platform roadmap: card issuing, ACH and reconciliation
- Lead discovery with enterprise customers and translate needs into product requirements
- Drive go-to-market strategy with sales and partnerships

Qualifications
- 6+ years of product management experience, including 3+ years in payments or fintech
- Track record shipping B2B APIs and platform products
- Deep understanding of risk management, KYC and compliance in financial services

Hybrid: 3 days a week in our New York office. Ledgerline is unable to sponsor visas for this position. $185,000 - $215,000 base.` },
  { id: 1004, type: 'job', title: 'Product Operations Associate', org: 'Cinderlake', loc: 'Remote', d: 3, sal: [78000, 92000], src: 'Ashby', url: 'https://jobs.ashbyhq.com/cinderlake/c5f0a2',
    desc: `Cinderlake makes scheduling software for home-care agencies. Product Operations keeps our product team fast: tooling, launches, feedback loops and data.

In this role you will
- Run our launch process and release notes
- Triage customer feedback from Zendesk and sales calls into themes for PMs
- Maintain Jira workflows and dashboards
- Find process improvement opportunities and own them end to end

You might be a fit if
- You have 1-3 years of experience in operations, customer success, analytics or product
- You're comfortable with SQL and spreadsheets (Excel or Google Sheets)
- You're organized and detail-oriented

Remote-first team. Pay range $78,000-$92,000.` },
  { id: 1005, type: 'job', title: 'Product Analyst', org: 'Halyard Co.', loc: 'Remote - US', d: 1, sal: [95000, 115000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/halyard/jobs/6104455',
    desc: `Halyard Co. runs an e-commerce marketplace for independent outdoor brands.

What you'll do
- Partner with product managers to define metrics and build dashboards in Looker
- Analyze user behavior with SQL and Python (pandas) to find growth opportunities
- Design, run and analyze A/B tests
- Present insights to leadership

What you bring
- 2+ years of experience in product analytics or data analysis
- Advanced SQL
- Experience with Amplitude or Mixpanel
- Statistics knowledge (hypothesis testing, regression)

Nice to have: dbt, experience at a marketplace. Remote within the United States. $95,000-$115,000.` },
  { id: 1116, type: 'job', title: 'Product Analyst', org: 'Halyard Co', loc: 'Remote', d: 1, sal: null, src: 'Adzuna', url: 'https://www.adzuna.com/details/4479233810',
    desc: `Halyard Co. runs an e-commerce marketplace for independent outdoor brands. Partner with product managers to define metrics and build dashboards in Looker. 2+ years of experience in product analytics...` },
  { id: 1006, type: 'job', title: 'Technical Product Manager, Data Platform', org: 'Ironvale Cloud', loc: 'Austin, TX', d: 14, sal: [160000, 185000], src: 'Workday', url: 'https://ironvale.wd5.myworkdayjobs.com/careers/job/Austin/TPM_R10422',
    desc: `Ironvale Cloud is a SaaS infrastructure company. Our data platform team builds the pipelines and APIs other teams depend on.

Responsibilities
- Own the roadmap for ingestion, data pipelines and our internal REST APIs
- Write technical specs with engineers; make build vs. buy calls
- Define SLAs and observability for platform services

Minimum qualifications
- 5+ years of experience, including 3+ years as a technical product manager or software engineer
- Experience with data warehousing, ETL and APIs
- Bachelor's degree in Computer Science or a related technical field

Preferred qualifications
- Experience with Kafka, Airflow or Snowflake

This role is based in our Austin office five days a week.` },
  { id: 1007, type: 'internship', title: 'Product Management Intern (Summer 2027)', org: 'Arclight', loc: 'San Jose, CA', d: 6, dl: 24, sal: [45, 45, 'hour'], src: 'Greenhouse', url: 'https://boards.greenhouse.io/arclight/jobs/7700124',
    desc: `Arclight builds collaboration tools for hardware engineering teams.

As a Product Management Intern you'll own a real feature for 12 weeks this summer: talk to users, write the spec, work with engineers and present results at the end.

Requirements
- Currently pursuing a bachelor's degree, graduating between December 2027 and June 2028
- Strong analytical skills and curiosity about how products get built
- Excellent communication skills

Bonus points
- SQL or any programming experience
- Prior internship, startup or student project experience

$45/hour plus housing stipend. On-site in San Jose.` },
  { id: 1008, type: 'job', title: 'Product Owner (Contract, 6 months)', org: 'Brightline Staffing Partners', loc: 'Remote', d: 4, sal: [60, 70, 'hour'], src: 'Adzuna', url: 'https://www.adzuna.com/details/4475551920',
    desc: `Our client, a leading insurance carrier, is seeking a Product Owner for a 6-month contract with possible extension. W2 or C2C.

Responsibilities
- Groom the backlog and write user stories for a claims modernization program
- Run sprint planning and reviews with two scrum teams

Requirements
- 4+ years as a Product Owner in an agile/Scrum environment
- Experience with Jira and Confluence
- Insurance domain experience preferred

$60-$70/hr depending on experience.` },
  { id: 1009, type: 'job', title: 'Data-Focused Product Manager (APM Program)', org: 'Meridian Analytics', loc: 'Remote (US)', d: 12, sal: [120000, 130000], src: 'Lever', url: 'https://jobs.lever.co/meridiananalytics/71ab0c',
    desc: `Meridian Analytics builds analytics software for retail chains.

Our APM program is a two-year rotation for early-career people who love data. You'll ship features on two different product teams.

What you'll need
- 0-2 years of experience; new grads welcome
- Required: SQL and Python for your own analysis
- Experience designing or analyzing A/B tests (coursework counts)
- Ability to explain data clearly to non-technical stakeholders

Nice to have
- Tableau or Looker
- Internship experience in product, analytics or consulting

Fully remote within the US. $120,000 - $130,000.` },
  { id: 1010, type: 'job', title: 'Product Manager', org: 'Halcyon Health', loc: 'Boston, MA (Hybrid)', d: 20, sal: [130000, 150000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/halcyonhealth/jobs/3301987',
    desc: `About us: Halcyon Health is a digital health company that helps patients manage chronic conditions with their care teams.

The role
You'll own our care-team dashboard used by nurses and care coordinators.

Requirements
- 3+ years of product management experience
- Experience building software for clinical users; familiarity with EHR systems such as Epic
- Understanding of HIPAA and handling protected health information
- Comfort with data: SQL or strong analytics partnership

Hybrid, 2 days a week in our Boston office. $130,000-$150,000.` },
  { id: 1011, type: 'job', title: 'Program Manager, Partnerships', org: 'Northbrook Capital', loc: 'New York, NY', d: 31, sal: null, src: 'Company site', url: 'https://careers.northbrookcapital.com/jobs/pm-partnerships',
    desc: `Northbrook Capital is an investment firm focused on growth-stage companies. We're looking for a Program Manager to run our portfolio partnerships program.

You will coordinate programs across 40 portfolio companies, manage timelines, and report results to partners.

Requirements: 4+ years of program management or project management experience, strong Excel and PowerPoint, outstanding organizational skills. In-person role in our Manhattan office.` },
  // ------------------------------------------------------------ DATA
  { id: 1013, type: 'job', title: 'Junior Data Analyst', org: 'Portside Analytics', loc: 'Remote (US)', d: 2, sal: [65000, 75000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/portside/jobs/8812001',
    desc: `Portside Analytics is a consultancy that builds reporting for regional retailers.

What you'll do
- Write SQL to pull and clean data for client reports
- Build and maintain dashboards in Tableau
- QA numbers in Excel before they go to clients

Requirements
- 0-2 years of experience; recent graduates encouraged to apply
- SQL (coursework or projects count)
- Excel: pivot tables, VLOOKUP
- Attention to detail

Nice to have: Python, any Tableau experience.
Remote within the US. $65,000-$75,000.` },
  { id: 1014, type: 'job', title: 'Data Analyst', org: 'Northlight Health', loc: 'Remote - US', d: 4, sal: [85000, 105000], src: 'Lever', url: 'https://jobs.lever.co/northlighthealth/a20e91',
    desc: `About us
Northlight Health is a digital health company helping patients get care at home.

What you'll do
- Build dashboards in Tableau and write SQL queries against PostgreSQL
- Run A/B tests with the product team
- Answer questions from operations and clinical leaders

Requirements
- 2+ years of experience in analytics
- Strong SQL and Python (pandas)
- Bachelor's degree or equivalent experience

Nice to have
- dbt, Looker
- Experience with R

Compensation: $85,000 - $105,000 per year. We are unable to sponsor visas at this time.` },
  { id: 1015, type: 'job', title: 'Senior Data Analyst', org: 'Delmar Financial', loc: 'Austin, TX (Hybrid)', d: 7, sal: [120000, 140000], src: 'Workday', url: 'https://delmar.wd1.myworkdayjobs.com/en-US/careers/job/Austin/Senior-Data-Analyst_R2231',
    desc: `Delmar Financial is a consumer lending company.

Responsibilities
- Lead analytics for our credit card product: portfolio performance, marketing funnel, risk
- Own our Looker semantic layer and dbt models with analytics engineering
- Mentor two junior analysts

Requirements
- 5+ years of experience in data analysis, ideally in financial services
- Expert SQL and Python
- Experience with Looker and dbt
- Ability to present to executives

Hybrid - 3 days a week in office in Austin. $120,000 - $140,000 + bonus.` },
  { id: 1016, type: 'job', title: 'Data Scientist I', org: 'Cinder & Vale', loc: 'Remote', d: 3, sal: [115000, 135000], src: 'Ashby', url: 'https://jobs.ashbyhq.com/cinderandvale/9d0e31',
    desc: `Cinder & Vale is an AI company building demand-forecasting models for grocery chains.

What you'll do
- Build and evaluate machine learning models (forecasting, classification)
- Analyze large datasets with Python, pandas and SQL
- Communicate results to customers' merchandising teams

Requirements
- 1-3 years of experience in data science or a quantitative field
- Bachelor's degree in statistics, computer science, math or a related field
- Strong Python and statistics; experience with scikit-learn

Preferred
- Master's degree
- Experience with time series forecasting or Spark

Fully remote. $115,000-$135,000.` },
  { id: 1017, type: 'job', title: 'Data Scientist, Experimentation', org: 'Brightloom Labs', loc: 'Chicago, IL (Hybrid)', d: 10, sal: [150000, 170000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/brightloom/jobs/2209871',
    desc: `Brightloom Labs is a consumer app company with millions of users.

You'll be our experimentation lead: designing A/B tests, building the experimentation platform's statistics, and teaching PMs how to read results.

Requirements
- 3+ years of experience in data science focused on experimentation
- Deep statistics: hypothesis testing, power analysis, regression
- SQL and Python
- MS or PhD in statistics, economics or a related field preferred

Hybrid in Chicago, 2 days a week. $150,000-$170,000.` },
  { id: 1018, type: 'job', title: 'Machine Learning Engineer', org: 'Cordage Systems', loc: 'Seattle, WA', d: 6, sal: [170000, 210000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/cordage/jobs/5512090',
    desc: `Cordage Systems builds AI-powered logistics software.

Responsibilities
- Train and deploy deep learning models with PyTorch
- Build model serving on AWS with Docker and Kubernetes
- Own MLOps: monitoring, retraining, feature store

Requirements
- 4+ years of experience as an ML engineer or software engineer
- Strong Python; PyTorch or TensorFlow
- Production experience with AWS and Kubernetes

We sponsor visas for this role (H-1B transfers welcome). On-site in Seattle. $170,000 - $210,000.` },
  { id: 1019, type: 'job', title: 'Data Engineer', org: 'Willowmere Tech', loc: 'Remote (US)', d: 2, sal: [140000, 160000], src: 'Lever', url: 'https://jobs.lever.co/willowmere/3cf902',
    desc: `Willowmere Tech builds billing software for subscription businesses.

What you'll do
- Build and own data pipelines with Airflow and Spark
- Model data in Snowflake with dbt
- Partner with analytics engineers on data modeling and quality

Requirements
- 3+ years of data engineering experience
- Python and SQL
- Experience with Airflow (or similar orchestration) and a cloud data warehouse
- Experience with AWS

Remote within the US. $140,000-$160,000.` },
  { id: 1020, type: 'job', title: 'Analytics Engineer', org: 'Milk & Ledger', loc: 'New York, NY (Hybrid)', d: 5, sal: [125000, 145000], src: 'Ashby', url: 'https://jobs.ashbyhq.com/milkandledger/0aa1c3',
    desc: `Milk & Ledger is a direct-to-consumer grocery brand.

You'll own our dbt project and the semantic layer that every team reports from.

Requirements
- 2+ years of experience in analytics engineering or data analysis
- Expert SQL and dbt
- Data modeling (dimensional modeling, star schema)
- Looker or another BI tool

Hybrid in NYC (2 days). $125,000 - $145,000.` },
  { id: 1021, type: 'job', title: 'BI Analyst', org: 'Foundry Retail', loc: 'Chicago, IL', d: 15, sal: [70000, 85000], src: 'iCIMS', url: 'https://careers-foundryretail.icims.com/jobs/4471/bi-analyst/job',
    desc: `Foundry Retail operates 140 home-goods stores across the Midwest.

Responsibilities
- Build Power BI reports for store operations and merchandising
- Write SQL against our SQL Server data warehouse
- Automate recurring Excel reports

Requirements
- 1-3 years of experience in business intelligence or reporting
- Power BI (DAX) and SQL
- Advanced Excel

This position is on-site at our Chicago headquarters. $70,000-$85,000.` },
  { id: 1022, type: 'job', title: 'Business Analyst, New Grad Program', org: 'Delmar Financial', loc: 'Austin, TX', d: 8, sal: [72000, 80000], src: 'Workday', url: 'https://delmar.wd1.myworkdayjobs.com/en-US/careers/job/Austin/BA-New-Grad_R2240',
    desc: `Delmar Financial's New Grad Business Analyst program places you on one of our operations or technology teams.

What you'll do
- Gather business requirements and document processes
- Analyze data in Excel and SQL to support decisions
- Help test new systems before launch

Who you are
- Graduating with a bachelor's degree by June 2027 or graduated in the last 12 months
- Strong Excel; SQL coursework a plus
- Clear communicator

On-site in Austin. $72,000-$80,000.` },
  { id: 1023, type: 'internship', title: 'Data Analyst Intern', org: 'Beacon Peak', loc: 'Remote', d: 3, dl: 12, sal: [28, 28, 'hour'], src: 'Greenhouse', url: 'https://boards.greenhouse.io/beaconpeak/jobs/9900341',
    desc: `Beacon Peak is a fitness-studio software company.

Summer internship (12 weeks, 40 hrs/week). You'll answer real questions from our product and marketing teams.

Requirements
- Currently enrolled in a bachelor's or master's program
- SQL and Excel (coursework is fine)

Nice to have
- Tableau or Power BI
- Python

$28/hour. Remote within the US.` },
  { id: 1024, type: 'job', title: 'Marketing Analyst', org: 'Bellwood', loc: 'Remote (US)', d: 9, sal: [80000, 95000], src: 'Lever', url: 'https://jobs.lever.co/bellwood/77d1aa',
    desc: `Bellwood is a B2B SaaS company that makes contract-management software.

Responsibilities
- Own marketing attribution and funnel reporting
- Analyze campaign performance with SQL and Google Analytics
- Support A/B testing of landing pages and emails

Requirements
- 2+ years in marketing analytics or data analysis
- SQL, Excel, Google Analytics
- Experience with HubSpot or Salesforce reporting a plus

Remote, US only. $80,000-$95,000.` },
  { id: 1025, type: 'job', title: 'Quantitative Analyst', org: 'Fennimore Partners', loc: 'Boston, MA', d: 18, sal: [160000, 200000], src: 'Company site', url: 'https://fennimorepartners.com/careers/quant-analyst',
    desc: `Fennimore Partners is an investment firm managing systematic strategies.

Responsibilities
- Research and backtest signals in Python
- Build risk and portfolio analysis tools

Requirements
- Master's or PhD in mathematics, statistics, physics or a related field
- 2+ years of experience in quantitative research
- Strong Python, statistics and probability

On-site in Boston. $160,000 - $200,000 + bonus.` },
  { id: 1026, type: 'job', title: 'Data Analyst (Healthcare Claims)', org: 'Rivermont Health', loc: 'Chicago, IL (Hybrid)', d: 40, sal: [78000, 92000], src: 'Adzuna', url: 'https://www.adzuna.com/details/4401122004',
    desc: `Rivermont Health is a regional hospital system. We're looking for a Data Analyst to support our revenue cycle team analyzing claims data. Requirements: 3+ years of experience with healthcare claims data, SQL, SAS or Python, Excel. Knowledge of medical coding (ICD-10, CPT codes) required. Hybrid in Chicago.` },
  { id: 1027, type: 'job', title: 'Data Analyst - Talent Community', org: 'Kestrel Partners', loc: 'New York, NY', d: 75, sal: null, src: 'Company site', url: 'https://kestrelpartners.com/careers/talent-community',
    desc: `Kestrel Partners is always accepting applications for analysts. Join our talent community and we'll reach out when a role that fits opens up. We look for SQL, Excel and strong communication.` },
  { id: 1028, type: 'job', title: 'Data Analyst (12-month contract)', org: 'Apex Talent Solutions', loc: 'Remote', d: 2, sal: [45, 50, 'hour'], src: 'Adzuna', url: 'https://www.adzuna.com/details/4480012233',
    desc: `Our client, a Fortune 500 retailer, is looking for a Data Analyst for a 12-month contract (W2). Requirements: 2+ years of SQL and Tableau experience, Excel, strong communication. $45-50/hr. Remote.` },
  { id: 1115, type: 'job', title: 'Senior Data Analyst', org: 'Portside Analytics', loc: 'Remote (US)', d: 95, seen: 21, sal: null, src: 'Adzuna', url: 'https://www.adzuna.com/details/4310098871',
    desc: `Portside Analytics is hiring a Senior Data Analyst. 5+ years of experience, SQL, Tableau, Python. Remote.` },
  // ------------------------------------------------------------ SOFTWARE
  { id: 1029, type: 'job', title: 'Software Engineer, New Grad', org: 'Latchkey Systems', loc: 'Remote (US)', d: 1, sal: [125000, 140000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/latchkey/jobs/6610021',
    desc: `Latchkey Systems makes access-control software for apartment buildings.

What you'll do
- Build backend services in Python and Go
- Write tests and help run our services in production
- Learn from senior engineers through code review and pairing

Requirements
- Bachelor's degree in Computer Science or equivalent practical experience, graduating by June 2027
- Solid computer science fundamentals: data structures and algorithms
- Experience with Python, Java or another language through school, internships or projects

Nice to have
- Experience with Go, PostgreSQL or AWS

Remote within the US. $125,000 - $140,000.` },
  { id: 1030, type: 'job', title: 'Backend Engineer', org: 'Ironvale Cloud', loc: 'Austin, TX (Hybrid)', d: 4, sal: [150000, 175000], src: 'Workday', url: 'https://ironvale.wd5.myworkdayjobs.com/careers/job/Austin/Backend-Engineer_R10498',
    desc: `Ironvale Cloud is a SaaS infrastructure company.

What you'll do
- Design and build REST APIs and microservices in Java and Spring Boot
- Own PostgreSQL schemas and performance
- Deploy to AWS

Requirements
- 3+ years of backend engineering experience
- Java and Spring Boot
- PostgreSQL or another relational database
- AWS

Hybrid - in office 3 days a week in Austin. $150,000 - $175,000.` },
  { id: 1044, type: 'job', title: 'Backend Engineer', org: 'Ironvale Cloud', loc: 'Austin, TX (Hybrid)', d: 46, sal: [150000, 175000], src: 'Workday', url: 'https://ironvale.wd5.myworkdayjobs.com/careers/job/Austin/Backend-Engineer_R10233',
    desc: `Ironvale Cloud is a SaaS infrastructure company. Design and build REST APIs and microservices in Java and Spring Boot. 3+ years of backend engineering experience. Hybrid in Austin.` },
  { id: 1031, type: 'job', title: 'Frontend Engineer', org: 'Millbrook Interactive', loc: 'Remote', d: 6, sal: [130000, 150000], src: 'Ashby', url: 'https://jobs.ashbyhq.com/millbrook/5be1a0',
    desc: `Millbrook Interactive builds learning games for schools.

Requirements
- 2+ years of professional frontend experience
- React and TypeScript
- HTML/CSS and an eye for detail
- Accessibility (WCAG) experience

Nice to have: Next.js, design systems, Figma.
Fully remote. $130,000-$150,000.` },
  { id: 1032, type: 'job', title: 'Full-Stack Engineer', org: 'Willowmere Tech', loc: 'Remote (US)', d: 3, sal: [135000, 155000], src: 'Lever', url: 'https://jobs.lever.co/willowmere/9c11d0',
    desc: `Willowmere Tech builds billing software for subscription businesses.

You'll work across our React frontend and Node.js services.

Requirements
- 2-4 years of software engineering experience
- React, TypeScript and Node.js
- PostgreSQL
- Unit testing and CI/CD

Remote within the US. $135,000-$155,000.` },
  { id: 1033, type: 'job', title: 'Senior Software Engineer, Platform', org: 'Cordage Systems', loc: 'Seattle, WA (Hybrid)', d: 11, sal: [190000, 230000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/cordage/jobs/5512230',
    desc: `Cordage Systems builds AI-powered logistics software.

Requirements
- 6+ years of software engineering experience
- Go or Java; distributed systems and system design
- Kubernetes, Docker and Terraform
- Experience mentoring engineers

Hybrid in Seattle. $190,000 - $230,000.` },
  { id: 1034, type: 'internship', title: 'Software Engineering Intern', org: 'Latchkey Systems', loc: 'Remote', d: 5, dl: 30, sal: [40, 45, 'hour'], src: 'Greenhouse', url: 'https://boards.greenhouse.io/latchkey/jobs/6610090',
    desc: `Summer 2027 internship. You'll ship real features with a mentor.

Requirements
- Pursuing a bachelor's degree in computer science or a related field
- Coursework or projects in Python or Java
- Data structures and algorithms

$40-$45 per hour. Remote (US).` },
  { id: 1035, type: 'job', title: 'iOS Engineer', org: 'Glasswing Studio', loc: 'Los Angeles, CA (Hybrid)', d: 9, sal: [145000, 165000], src: 'Lever', url: 'https://jobs.lever.co/glasswing/1f0e22',
    desc: `Glasswing Studio makes photo-editing apps for iPhone and iPad.

Requirements
- 3+ years building iOS apps in Swift
- SwiftUI and UIKit
- Experience shipping to the App Store

Hybrid in Los Angeles. $145,000-$165,000.` },
  { id: 1036, type: 'job', title: 'Site Reliability Engineer', org: 'Halyard Co.', loc: 'Remote (US)', d: 13, sal: [150000, 170000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/halyard/jobs/6104890',
    desc: `Halyard Co. runs an e-commerce marketplace for outdoor brands.

Requirements
- 3+ years of SRE or DevOps experience
- Linux, Kubernetes and Terraform
- AWS
- Observability with Prometheus and Grafana; on-call experience

Remote within the US. $150,000 - $170,000.` },
  { id: 1037, type: 'job', title: 'QA Automation Engineer', org: 'Brightpath Software', loc: 'Remote', d: 7, sal: [95000, 115000], src: 'Lever', url: 'https://jobs.lever.co/brightpath/aa31d9',
    desc: `Brightpath Software builds sales-engagement tools.

Requirements
- 2+ years of test automation experience
- Selenium or Cypress
- Python or JavaScript
- CI/CD (GitHub Actions)

Remote. $95,000 - $115,000.` },
  { id: 1038, type: 'job', title: 'Junior Software Developer', org: 'Brightloom Labs', loc: 'Chicago, IL', d: 22, sal: [80000, 95000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/brightloom/jobs/2209111',
    desc: `Brightloom Labs is a consumer app company.

Requirements
- 0-2 years of experience
- Python
- Unit testing
- Git

On-site in our Chicago office. $80,000-$95,000.` },
  { id: 1039, type: 'job', title: 'Software Engineer II', org: 'Thistledown Software', loc: 'Seattle, WA', d: 16, sal: [135000, 155000], src: 'iCIMS', url: 'https://careers-thistledown.icims.com/jobs/2210/software-engineer-ii/job',
    desc: `Thistledown Software builds accounting software for small businesses.

Requirements
- 2-4 years of professional software development
- C# and .NET
- SQL Server
- Azure

We will sponsor visas for qualified candidates. On-site in Seattle. $135,000-$155,000.` },
  { id: 1040, type: 'job', title: 'Embedded Software Engineer', org: 'Arcwright Robotics', loc: 'Pittsburgh, PA', d: 8, sal: [120000, 150000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/arcwright/jobs/1180044',
    desc: `Arcwright Robotics builds autonomous inspection robots for defense and energy customers.

Requirements
- 3+ years of embedded software development in C and C++
- Experience with RTOS and microcontrollers
- Linux

Due to ITAR requirements, applicants must be U.S. citizens. On-site in Pittsburgh. $120,000 - $150,000.` },
  { id: 1041, type: 'job', title: 'Software Engineer', org: 'Granite Peak Federal', loc: 'Arlington, VA', d: 12, sal: [110000, 140000], src: 'Company site', url: 'https://granitepeakfederal.com/careers/swe-2291',
    desc: `Granite Peak Federal delivers software to federal agencies.

Requirements
- 2+ years of Java development
- Active Secret security clearance required
- Experience with Linux and Git

On-site in Arlington, VA. $110,000-$140,000.` },
  { id: 1042, type: 'job', title: 'Machine Learning Engineer (NLP)', org: 'Cinder & Vale', loc: 'San Francisco, CA (Hybrid)', d: 3, sal: [175000, 210000], src: 'Ashby', url: 'https://jobs.ashbyhq.com/cinderandvale/2d7f10',
    desc: `Requirements
- 3+ years of experience in machine learning engineering
- NLP and large language models (LLMs)
- PyTorch and Python
- Experience deploying models to production

Hybrid in SF. $175,000 - $210,000.` },
  { id: 1043, type: 'job', title: 'Web Developer (Part-time)', org: 'Osprey Foundation', loc: 'Remote', d: 10, sal: [35, 45, 'hour'], src: 'Company site', url: 'https://ospreyfoundation.org/jobs/web-developer',
    desc: `The Osprey Foundation is a nonprofit funding youth entrepreneurship programs.

Part-time, about 20 hours a week. You'll maintain our website and donation pages.

Requirements
- HTML/CSS and JavaScript
- 1+ years of web development experience
- Accessibility awareness

$35-45/hour. Fully remote.` },
  // ------------------------------------------------------------ DESIGN
  { id: 1045, type: 'job', title: 'Product Designer', org: 'Glasswing Studio', loc: 'Remote (US)', d: 4, sal: [120000, 140000], src: 'Lever', url: 'https://jobs.lever.co/glasswing/4a2b19',
    desc: `Glasswing Studio makes photo-editing apps.

Requirements
- 3+ years of product design experience with a strong portfolio
- Figma, prototyping and design systems
- User research and usability testing

Remote within the US. $120,000-$140,000.` },
  { id: 1046, type: 'job', title: 'UX Designer, Early Career', org: 'Northlight Health', loc: 'Remote', d: 6, sal: [85000, 100000], src: 'Lever', url: 'https://jobs.lever.co/northlighthealth/b7712e',
    desc: `Northlight Health is a digital health company helping patients get care at home.

What you'll do
- Design patient-facing flows: wireframes, high-fidelity mockups and prototypes in Figma
- Run usability testing with patients

Requirements
- 0-2 years of UX design experience (bootcamp, internships and projects count)
- Figma and wireframing
- A portfolio showing your process

Remote. $85,000 - $100,000.` },
  { id: 1047, type: 'job', title: 'UX Researcher', org: 'Halcyon Health', loc: 'Boston, MA (Hybrid)', d: 12, sal: [105000, 125000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/halcyonhealth/jobs/3302200',
    desc: `About us: Halcyon Health is a digital health company working with patients and clinicians.

Requirements
- 2+ years of UX research experience
- User interviews, usability testing and surveys; mixed methods
- Experience presenting insights to product teams

Hybrid in Boston. $105,000-$125,000.` },
  { id: 1048, type: 'job', title: 'Graphic Designer', org: 'Bellwood', loc: 'New York, NY (Hybrid)', d: 9, sal: [65000, 80000], src: 'Lever', url: 'https://jobs.lever.co/bellwood/2a9f01',
    desc: `Requirements
- 2+ years of graphic design experience
- Adobe Creative Suite (Illustrator, InDesign, Photoshop)
- Brand identity and typography
- Portfolio required

Hybrid in NYC. $65,000-$80,000.` },
  { id: 1049, type: 'internship', title: 'UX Design Intern', org: 'Millbrook Interactive', loc: 'Remote', d: 2, dl: 9, sal: [30, 30, 'hour'], src: 'Ashby', url: 'https://jobs.ashbyhq.com/millbrook/7aa1f3',
    desc: `Summer internship designing learning games. Requirements: currently enrolled in a design, HCI or related program; Figma; a portfolio with at least two projects. $30/hour, remote.` },
  { id: 1050, type: 'job', title: 'Visual Designer (Contract)', org: 'Creative Circle', loc: 'New York, NY', d: 5, sal: [50, 60, 'hour'], src: 'Adzuna', url: 'https://www.adzuna.com/details/4479901212',
    desc: `Creative Circle is seeking a Visual Designer for a 3-month contract with our client, a beauty brand. Adobe Creative Suite, typography, layout design. On-site in NYC. $50-60/hr.` },
  // ------------------------------------------------------------ MARKETING
  { id: 1051, type: 'job', title: 'Marketing Coordinator', org: 'Harbor & Pine', loc: 'Remote (US)', d: 3, sal: [52000, 60000], src: 'Lever', url: 'https://jobs.lever.co/harborandpine/58a1e0',
    desc: `Harbor & Pine is a direct-to-consumer home goods brand.

What you'll do
- Plan and schedule social media posts across Instagram and TikTok
- Build email campaigns in Klaviyo
- Create graphics in Canva

Requirements
- 0-2 years of marketing experience (internships count)
- Social media and email marketing
- Excellent writing

Remote, US. $52,000 - $60,000.` },
  { id: 1052, type: 'job', title: 'Growth Marketing Manager', org: 'Twin River', loc: 'Remote', d: 6, sal: [120000, 140000], src: 'Lever', url: 'https://jobs.lever.co/twinriver/31bbc0',
    desc: `Twin River is a consumer budgeting app.

Requirements
- 4+ years of growth or performance marketing experience
- Paid social and paid search (Google Ads, Meta Ads)
- SEO and conversion rate optimization
- SQL is a plus

Remote. $120,000 - $140,000.` },
  { id: 1053, type: 'job', title: 'Content Marketing Specialist', org: 'Brightpath Software', loc: 'Remote', d: 11, sal: [70000, 85000], src: 'Lever', url: 'https://jobs.lever.co/brightpath/c0e912',
    desc: `Brightpath Software is a B2B SaaS company.

Requirements
- 2+ years of content marketing experience
- Content strategy and SEO
- Copywriting for B2B audiences
- Experience with HubSpot

Remote. $70,000-$85,000.` },
  { id: 1054, type: 'job', title: 'Social Media Coordinator', org: 'Fernway Labs', loc: 'San Francisco, CA', d: 8, sal: [60000, 70000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/fernwaylabs/jobs/4822030',
    desc: `Requirements
- 1+ years managing social media channels
- TikTok, Instagram and LinkedIn
- Community management

On-site in our San Francisco office. $60,000-$70,000.` },
  { id: 1055, type: 'job', title: 'Product Marketing Associate', org: 'Bellwood', loc: 'Remote', d: 2, sal: [85000, 95000], src: 'Lever', url: 'https://jobs.lever.co/bellwood/6c2e80',
    desc: `Bellwood is a B2B SaaS company that makes contract-management software.

Requirements
- 1-3 years in product marketing, marketing or consulting
- Positioning and messaging; competitive analysis
- Strong writing and presentation skills

Remote. $85,000 - $95,000.` },
  { id: 1056, type: 'job', title: 'SEO Specialist', org: 'Harlow Digital', loc: 'Remote', d: 19, sal: [60000, 75000], salPred: true, src: 'Adzuna', url: 'https://www.adzuna.com/details/4460021110',
    desc: `Harlow Digital is a marketing agency. We need an SEO Specialist with 2+ years of SEO experience, keyword research, Google Analytics and Ahrefs. Remote.` },
  { id: 1057, type: 'internship', title: 'Marketing Intern', org: 'Alder & Finch', loc: 'New York, NY (Hybrid)', d: 4, dl: 5, sal: [20, 20, 'hour'], src: 'Greenhouse', url: 'https://boards.greenhouse.io/alderfinch/jobs/1102000',
    desc: `Alder & Finch is a stationery brand. Summer marketing internship: social media, Canva graphics, event planning. Currently enrolled students. $20/hour, hybrid in NYC.` },
  { id: 1058, type: 'job', title: 'Email Marketing Specialist (Part-time)', org: 'Loomwell Systems', loc: 'Remote', d: 7, sal: [30, 35, 'hour'], src: 'Lever', url: 'https://jobs.lever.co/loomwell/0f4e12',
    desc: `Part-time (20-25 hours/week). Requirements: 2+ years of email marketing, Klaviyo or Braze, copywriting. $30-35/hour. Remote.` },
  // ------------------------------------------------------------ SALES / CUSTOMER
  { id: 1059, type: 'job', title: 'Sales Development Representative', org: 'Brightpath Software', loc: 'Remote (US)', d: 2, sal: [55000, 55000], src: 'Lever', url: 'https://jobs.lever.co/brightpath/1d0a88',
    desc: `Brightpath Software is a B2B SaaS company.

What you'll do
- Prospecting: cold calling and cold emailing into mid-market accounts
- Qualify leads and book meetings for account executives
- Track everything in Salesforce

Requirements
- 0-1 years of experience; new grads welcome
- Competitive, coachable, resilient

Base $55,000 + commission (OTE $80,000). Remote, US.` },
  { id: 1060, type: 'job', title: 'Account Executive, Mid-Market', org: 'Verity Cloud', loc: 'Chicago, IL (Hybrid)', d: 10, sal: [85000, 95000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/veritycloud/jobs/4001221',
    desc: `Requirements
- 3+ years of full-cycle SaaS sales experience with a track record of quota attainment
- Pipeline management in Salesforce
- Negotiation

Hybrid in Chicago. $85,000-$95,000 base + commission.` },
  { id: 1061, type: 'job', title: 'Business Development Representative', org: 'Harlow Digital', loc: 'Remote', d: 35, sal: [50000, 55000], src: 'Adzuna', url: 'https://www.adzuna.com/details/4390001223',
    desc: `Harlow Digital is a marketing agency. BDR role: outbound prospecting and lead generation. 0-2 years experience. $50-55k + commission. Remote.` },
  { id: 1062, type: 'job', title: 'Customer Success Manager', org: 'Loomwell Systems', loc: 'Remote (US)', d: 4, sal: [85000, 100000], src: 'Lever', url: 'https://jobs.lever.co/loomwell/5c5a1e',
    desc: `Loomwell Systems makes HR software for mid-size companies.

Requirements
- 2+ years in customer success or account management at a SaaS company
- Customer onboarding, renewals and QBRs
- Salesforce or HubSpot

Remote, US. $85,000 - $100,000.` },
  { id: 1063, type: 'job', title: 'Customer Support Specialist', org: 'Ferngrove Tech', loc: 'Remote', d: 1, sal: [45000, 52000], src: 'Lever', url: 'https://jobs.lever.co/ferngrove/9e1c00',
    desc: `Ferngrove Tech makes smart thermostats.

Requirements
- 0-2 years of customer support experience
- Zendesk or a similar help desk tool
- Patient troubleshooting over chat, email and phone

Bilingual Spanish is a plus. Remote. $45,000 - $52,000.` },
  { id: 1064, type: 'job', title: 'Account Manager', org: 'Thistledown Software', loc: 'Seattle, WA', d: 13, sal: [75000, 90000], src: 'iCIMS', url: 'https://careers-thistledown.icims.com/jobs/2290/account-manager/job',
    desc: `Requirements
- 2+ years of account management experience
- Upselling, renewals and client relationships
- Salesforce

On-site in Seattle. $75,000-$90,000 + bonus.` },
  { id: 1065, type: 'job', title: 'Solutions Engineer', org: 'Willowmere Tech', loc: 'Remote', d: 9, sal: [140000, 170000], src: 'Lever', url: 'https://jobs.lever.co/willowmere/0c33e1',
    desc: `Requirements
- 3+ years as a solutions engineer, sales engineer or software engineer
- REST APIs and SQL
- Running technical demos for customers

Remote. Up to 30% travel. $140,000 - $170,000 OTE.` },
  { id: 1066, type: 'internship', title: 'Customer Success Intern', org: 'Loomwell Systems', loc: 'Remote', d: 6, sal: [22, 22, 'hour'], src: 'Lever', url: 'https://jobs.lever.co/loomwell/7a7a11',
    desc: `Summer internship on our customer success team. Currently enrolled students. Customer onboarding support, Excel. $22/hour, remote.` },
  { id: 1067, type: 'job', title: 'Inside Sales Representative', org: 'Northstar Staffing Group', loc: 'Dallas, TX', d: 3, sal: null, src: 'Adzuna', url: 'https://www.adzuna.com/details/4481100011',
    desc: `Our client is looking for motivated Inside Sales Representatives. Commission only, high earning potential! Door-to-door and cold calling. No experience needed. Dallas, TX.` },
  // ------------------------------------------------------------ FINANCE
  { id: 1068, type: 'job', title: 'Financial Analyst', org: 'Northbridge Holdings', loc: 'Remote (US)', d: 5, sal: [80000, 95000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/northbridge/jobs/3001120',
    desc: `Northbridge Holdings owns a portfolio of specialty manufacturing businesses.

What you'll do
- Build financial models and monthly variance analysis
- Support budgeting and forecasting with business units

Requirements
- 1-3 years of experience in FP&A, banking or accounting
- Advanced Excel and financial modeling
- Bachelor's degree in finance, accounting or economics

Remote within the US. $80,000 - $95,000.` },
  { id: 1069, type: 'job', title: 'FP&A Analyst', org: 'Delmar Financial', loc: 'Austin, TX (Hybrid)', d: 3, sal: [90000, 105000], src: 'Workday', url: 'https://delmar.wd1.myworkdayjobs.com/en-US/careers/job/Austin/FPA-Analyst_R2261',
    desc: `Requirements
- 2+ years in FP&A or corporate finance
- Budgeting, forecasting and variance analysis
- Advanced Excel; SQL is a plus

Hybrid in Austin. $90,000-$105,000.` },
  { id: 1070, type: 'job', title: 'Staff Accountant', org: 'Bellhaven Clinical Group', loc: 'Chicago, IL', d: 14, sal: [65000, 78000], src: 'Company site', url: 'https://bellhavenclinical.com/careers/staff-accountant',
    desc: `Bellhaven Clinical Group operates outpatient clinics.

Requirements
- 1-3 years of accounting experience
- US GAAP, reconciliations, journal entries and month-end close
- QuickBooks or NetSuite
- Bachelor's degree in accounting

CPA or CPA-track preferred. On-site in Chicago. $65,000-$78,000.` },
  { id: 1071, type: 'job', title: 'Investment Analyst, Rotational Program', org: 'Fennimore Partners', loc: 'Boston, MA', d: 21, sal: [95000, 110000], src: 'Company site', url: 'https://fennimorepartners.com/careers/investment-analyst',
    desc: `Two-year rotation across our credit and equity teams.

Requirements
- Bachelor's degree, graduating by June 2027
- Financial modeling and valuation (coursework or internships)
- Excel and PowerPoint

CFA Level I is a plus. On-site in Boston. $95,000 - $110,000.` },
  { id: 1072, type: 'internship', title: 'Financial Analyst Intern', org: 'Aldergate Capital', loc: 'New York, NY', d: 9, dl: 18, sal: [35, 35, 'hour'], src: 'Greenhouse', url: 'https://boards.greenhouse.io/aldergate/jobs/8800123',
    desc: `Summer analyst internship. Requirements: pursuing a bachelor's in finance, economics or accounting; Excel; financial modeling coursework. $35/hour. On-site in NYC.` },
  { id: 1073, type: 'job', title: 'Senior Accountant', org: 'Thornfield Financial', loc: 'Remote', d: 6, sal: [95000, 110000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/thornfield/jobs/2209333',
    desc: `Requirements
- 4+ years of accounting experience, public accounting preferred
- Active CPA license required
- SOX compliance and internal controls
- NetSuite

Remote. $95,000 - $110,000.` },
  { id: 1074, type: 'job', title: 'Credit Risk Analyst', org: 'Ledgerline', loc: 'New York, NY (Hybrid)', d: 7, sal: [105000, 125000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/ledgerline/jobs/5502300',
    desc: `About Ledgerline: Ledgerline is a fintech company providing payments infrastructure for lenders.

Requirements
- 2+ years in credit risk or risk analytics
- SQL and Python
- Statistics (regression, hypothesis testing)

Candidates must be authorized to work in the U.S. without current or future sponsorship. Hybrid in NYC. $105,000 - $125,000.` },
  { id: 1075, type: 'job', title: 'Bookkeeper (Part-time)', org: 'Harbor & Pine', loc: 'Remote', d: 12, sal: [25, 30, 'hour'], src: 'Lever', url: 'https://jobs.lever.co/harborandpine/1aa001',
    desc: `Part-time, 15 hours a week. QuickBooks, reconciliations, accounts payable. $25-30/hour. Remote.` },
  // ------------------------------------------------------------ PEOPLE
  { id: 1076, type: 'job', title: 'Recruiting Coordinator', org: 'Windmere Partners', loc: 'Remote (US)', d: 3, sal: [55000, 65000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/windmere/jobs/4400120',
    desc: `Requirements
- 0-2 years of experience in recruiting, HR or a coordinator role
- Interview scheduling and candidate communication
- Greenhouse or another applicant tracking system

Remote, US. $55,000-$65,000.` },
  { id: 1077, type: 'job', title: 'Technical Recruiter', org: 'Cindergate Labs', loc: 'Austin, TX (Hybrid)', d: 8, sal: [85000, 105000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/cindergate/jobs/6602001',
    desc: `Requirements
- 2+ years of full-cycle recruiting, ideally engineering hiring
- Sourcing candidates with LinkedIn and boolean search
- Greenhouse

Hybrid in Austin. $85,000 - $105,000.` },
  { id: 1078, type: 'job', title: 'HR Generalist', org: 'Marlstone Group', loc: 'Denver, CO', d: 17, sal: [70000, 82000], src: 'Company site', url: 'https://marlstonegroup.com/careers/hr-generalist',
    desc: `Requirements
- 3+ years of HR generalist experience
- Employee relations, benefits administration and HR compliance
- HRIS experience (BambooHR or Workday)

SHRM-CP or PHR preferred. On-site in Denver. $70,000-$82,000.` },
  { id: 1079, type: 'job', title: 'People Operations Associate', org: 'Cindergate Labs', loc: 'Remote', d: 5, sal: [60000, 70000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/cindergate/jobs/6602111',
    desc: `Requirements
- 1-2 years in people operations or HR
- Onboarding new hires and HRIS data
- Excel or Google Sheets

Remote. $60,000-$70,000.` },
  { id: 1080, type: 'internship', title: 'HR Intern', org: 'Marlstone Group', loc: 'Remote', d: 10, sal: [20, 20, 'hour'], src: 'Company site', url: 'https://marlstonegroup.com/careers/hr-intern',
    desc: `Summer HR internship supporting recruiting and onboarding. Currently enrolled students. $20/hour, remote.` },
  // ------------------------------------------------------------ OPERATIONS
  { id: 1081, type: 'job', title: 'Operations Analyst', org: 'Kestrel Partners', loc: 'New York, NY (Hybrid)', d: 6, sal: [75000, 90000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/kestrel/jobs/1203330',
    desc: `Requirements
- 1-3 years in operations, consulting or analytics
- Excel and SQL
- Process improvement and documenting workflows

Hybrid in NYC. $75,000 - $90,000.` },
  { id: 1082, type: 'job', title: 'Supply Chain Analyst', org: 'Grovemark Logistics', loc: 'Remote (US)', d: 4, sal: [78000, 92000], src: 'Lever', url: 'https://jobs.lever.co/grovemark/0091ee',
    desc: `Grovemark Logistics is a freight and warehousing company.

Requirements
- 2+ years in supply chain or demand planning
- Excel and SQL
- SAP or another ERP

Remote within the US. $78,000-$92,000.` },
  { id: 1083, type: 'job', title: 'Logistics Coordinator', org: 'Hallowick Distribution', loc: 'Dallas, TX', d: 9, sal: [45000, 52000], src: 'Company site', url: 'https://hallowick.com/careers/logistics-coordinator',
    desc: `Hallowick Distribution runs regional distribution centers.

Requirements
- 0-2 years in logistics or warehouse operations
- Track inbound shipping containers and freight schedules
- Excel

On-site in Dallas. $45,000-$52,000.` },
  { id: 1084, type: 'job', title: 'Project Coordinator', org: 'Fairhaven Systems', loc: 'Seattle, WA (Hybrid)', d: 11, sal: [62000, 72000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/fairhaven/jobs/3310021',
    desc: `Requirements
- 1-2 years of project coordination experience
- Project management tools such as Jira or Smartsheet
- Stakeholder communication

PMP or CAPM is a plus. Hybrid in Seattle. $62,000-$72,000.` },
  { id: 1085, type: 'job', title: 'Technical Program Manager', org: 'Cordage Systems', loc: 'Seattle, WA', d: 15, sal: [165000, 190000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/cordage/jobs/5512501',
    desc: `Requirements
- 5+ years of technical program management experience
- Agile delivery across multiple engineering teams
- Cross-functional collaboration with product and engineering

On-site in Seattle. $165,000-$190,000.` },
  { id: 1086, type: 'internship', title: 'Operations Intern', org: 'Fairhaven Group', loc: 'Remote', d: 2, sal: [24, 24, 'hour'], src: 'Greenhouse', url: 'https://boards.greenhouse.io/fairhavengroup/jobs/9910012',
    desc: `Summer operations internship. Currently enrolled students. Excel, process documentation. $24/hour, remote.` },
  { id: 1087, type: 'job', title: 'Procurement Specialist', org: 'Coldwater Freight Systems', loc: 'Houston, TX', d: 26, sal: [70000, 80000], src: 'Company site', url: 'https://coldwaterfreight.com/careers/procurement',
    desc: `Requirements
- 3+ years in procurement or purchasing
- Vendor negotiation and purchase orders
- SAP

Up to 25% travel to supplier sites. On-site in Houston. $70,000-$80,000.` },
  { id: 1088, type: 'job', title: 'Strategy & Operations Associate', org: 'Beacon Peak', loc: 'San Francisco, CA (Hybrid)', d: 7, sal: [110000, 125000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/beaconpeak/jobs/9900500',
    desc: `Requirements
- 2+ years in management consulting, investment banking or strategy
- Excel, SQL and slide decks
- Structured problem solving

Hybrid in SF. $110,000 - $125,000.` },
  // ------------------------------------------------------------ HEALTHCARE
  { id: 1089, type: 'job', title: 'Registered Nurse - Med/Surg (Nights)', org: 'Rivermont Health', loc: 'Chicago, IL', d: 3, sal: [40, 52, 'hour'], src: 'Company site', url: 'https://rivermonthealth.org/careers/rn-medsurg',
    desc: `Rivermont Health is a regional hospital system.

Requirements
- Active RN license in Illinois
- BLS certification
- 1+ years of acute care experience
- Epic EHR experience preferred

Night shift, three 12-hour shifts. $40-$52/hour.` },
  { id: 1090, type: 'job', title: 'Medical Assistant', org: 'Ashworth Medical Center', loc: 'Boston, MA', d: 6, sal: [21, 24, 'hour'], src: 'Company site', url: 'https://ashworthmed.org/careers/medical-assistant',
    desc: `Requirements
- CMA or RMA certification
- Vital signs, patient intake and EHR documentation
- 0-2 years of clinical experience

$21-$24/hour. On-site in Boston.` },
  { id: 1091, type: 'job', title: 'Patient Care Coordinator', org: 'Rivermont Health', loc: 'Chicago, IL', d: 9, sal: [42000, 48000], src: 'Company site', url: 'https://rivermonthealth.org/careers/patient-care-coordinator',
    desc: `Requirements
- 0-2 years in a healthcare office
- Insurance verification and prior authorizations
- Epic

On-site in Chicago. $42,000-$48,000.` },
  { id: 1092, type: 'job', title: 'Clinical Research Coordinator', org: 'Ashworth Medical Center', loc: 'Boston, MA', d: 5, sal: [55000, 65000], src: 'Company site', url: 'https://ashworthmed.org/careers/crc',
    desc: `Requirements
- Bachelor's degree in a life science or related field
- 1-2 years of clinical research experience (clinical trials, IRB submissions, informed consent)
- Good Clinical Practice (GCP) training

On-site in Boston. $55,000-$65,000.` },
  { id: 1093, type: 'job', title: 'Health Data Analyst', org: 'Halcyon Health', loc: 'Remote (US)', d: 8, sal: [85000, 100000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/halcyonhealth/jobs/3302551',
    desc: `About us: Halcyon Health is a digital health company that helps patients manage chronic conditions.

Requirements
- 2+ years of experience analyzing healthcare data
- SQL and Tableau
- HIPAA awareness
- Python is a plus

Remote, US. $85,000-$100,000.` },
  { id: 1094, type: 'job', title: 'Healthcare Administration Associate', org: 'Bellhaven Clinical Group', loc: 'Remote', d: 13, sal: [48000, 55000], src: 'Company site', url: 'https://bellhavenclinical.com/careers/admin-associate',
    desc: `Support operations for our outpatient clinics. Requirements: 0-2 years of experience, Excel, strong organizational skills, medical terminology a plus. $48,000-$55,000. Remote.` },
  { id: 1095, type: 'internship', title: 'Clinical Research Intern', org: 'Ashworth Medical Center', loc: 'Boston, MA', d: 15, dl: 40, sal: [20, 20, 'hour'], src: 'Company site', url: 'https://ashworthmed.org/careers/cr-intern',
    desc: `Summer internship supporting clinical trials. Currently enrolled undergraduates in biology or public health. $20/hour. On-site.` },
  // ------------------------------------------------------------ LEGAL
  { id: 1096, type: 'job', title: 'Paralegal', org: 'Cassowary & Voss LLP', loc: 'New York, NY', d: 7, sal: [65000, 78000], src: 'Company site', url: 'https://cassowaryvoss.com/careers/paralegal',
    desc: `Requirements
- 2+ years of litigation paralegal experience
- Legal research with Westlaw or LexisNexis
- Document review and court filings
- Paralegal certificate

On-site in NYC. $65,000-$78,000.` },
  { id: 1097, type: 'job', title: 'Compliance Analyst', org: 'Thornfield Financial', loc: 'Remote (US)', d: 4, sal: [75000, 88000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/thornfield/jobs/2209500',
    desc: `Requirements
- 1-3 years in compliance, risk or audit
- AML and KYC
- Regulatory compliance testing

Remote, US. $75,000-$88,000.` },
  { id: 1098, type: 'internship', title: 'Legal Intern, Corporate Affairs', org: 'Marchbanks & Reid', loc: 'Washington, DC', d: 11, dl: 14, sal: [25, 25, 'hour'], src: 'Company site', url: 'https://marchbanksreid.com/careers/legal-intern',
    desc: `Summer internship for law students or pre-law undergraduates. Legal research and legal writing. $25/hour. On-site in DC.` },
  { id: 1099, type: 'job', title: 'Contracts Administrator', org: 'Arcwright Robotics', loc: 'Pittsburgh, PA (Hybrid)', d: 19, sal: [68000, 80000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/arcwright/jobs/1180300',
    desc: `Requirements
- 2+ years of contract administration
- Contract review and redlining
- Salesforce

Hybrid in Pittsburgh. $68,000-$80,000.` },
  // ------------------------------------------------------------ EDUCATION / CONTENT / RESEARCH / ADMIN / IT
  { id: 1100, type: 'job', title: 'Instructional Designer', org: 'Lumen Learning Co.', loc: 'Remote', d: 6, sal: [70000, 85000], src: 'Lever', url: 'https://jobs.lever.co/lumenlearning/1e0e33',
    desc: `Lumen Learning Co. is an edtech company building online learning for community colleges.

Requirements
- 2+ years of instructional design experience
- Articulate Storyline and an LMS
- Curriculum design

Remote. $70,000-$85,000.` },
  { id: 1101, type: 'job', title: 'Math Tutor (Part-time)', org: 'Brightside Tutoring', loc: 'Remote', d: 2, sal: [25, 35, 'hour'], src: 'Company site', url: 'https://brightsidetutoring.com/jobs/math-tutor',
    desc: `Part-time online tutoring, 5-15 hours a week. Tutoring and test prep in algebra through calculus. $25-35/hour.` },
  { id: 1102, type: 'job', title: 'High School Science Teacher', org: 'Westbrook Academy', loc: 'Denver, CO', d: 20, sal: [55000, 68000], src: 'Company site', url: 'https://westbrookacademy.org/careers/science-teacher',
    desc: `Requirements
- Colorado teaching license (or eligible)
- Lesson planning and classroom management
- Bachelor's degree in a science field

On-site. $55,000-$68,000.` },
  { id: 1103, type: 'job', title: 'Technical Writer', org: 'Willowmere Tech', loc: 'Remote', d: 9, sal: [95000, 110000], src: 'Lever', url: 'https://jobs.lever.co/willowmere/7ee012',
    desc: `Requirements
- 2+ years of technical writing
- API documentation and docs-as-code workflows
- Git

Remote. $95,000-$110,000.` },
  { id: 1104, type: 'job', title: 'Copywriter', org: 'Harlow Digital', loc: 'New York, NY (Hybrid)', d: 5, sal: [60000, 72000], src: 'Greenhouse', url: 'https://boards.greenhouse.io/harlowdigital/jobs/5600012',
    desc: `Harlow Digital is a marketing agency. Requirements: 1-3 years of copywriting, brand campaigns, a portfolio. Hybrid in NYC. $60,000-$72,000.` },
  { id: 1105, type: 'job', title: 'Research Assistant, Economics', org: 'Carrow Center', loc: 'Washington, DC', d: 8, sal: [55000, 62000], src: 'Company site', url: 'https://carrowcenter.org/careers/research-assistant',
    desc: `The Carrow Center is a nonprofit policy research organization.

Requirements
- Bachelor's degree in economics or a related field
- Stata or R
- Research methods and literature reviews

On-site in DC. $55,000-$62,000.` },
  { id: 1106, type: 'job', title: 'Policy Analyst', org: 'Ridgeline Institute', loc: 'Remote (US)', d: 14, sal: [70000, 82000], src: 'Company site', url: 'https://ridgelineinstitute.org/careers/policy-analyst',
    desc: `Ridgeline Institute is a nonprofit focused on data and society.

Requirements
- 2+ years of policy research
- Policy analysis and writing policy memos
- Excel or Stata

Remote. $70,000-$82,000.` },
  { id: 1107, type: 'job', title: 'Executive Assistant', org: 'Northbrook Capital', loc: 'New York, NY', d: 6, sal: [75000, 90000], src: 'Company site', url: 'https://careers.northbrookcapital.com/jobs/executive-assistant',
    desc: `Requirements
- 3+ years supporting executives
- Calendar management and travel arrangements
- Microsoft Office

In-person in Manhattan. $75,000-$90,000.` },
  { id: 1108, type: 'job', title: 'IT Support Specialist', org: 'Ferngrove Tech', loc: 'Austin, TX', d: 4, sal: [48000, 58000], src: 'Lever', url: 'https://jobs.lever.co/ferngrove/1c1c12',
    desc: `Requirements
- 0-2 years of help desk or desktop support
- Active Directory and Office 365
- CompTIA A+ is a plus

On-site in Austin. $48,000-$58,000.` },
  { id: 1109, type: 'job', title: 'Cybersecurity Analyst', org: 'Granite Peak Federal', loc: 'Arlington, VA', d: 10, sal: [95000, 115000], src: 'Company site', url: 'https://granitepeakfederal.com/careers/cyber-analyst-2301',
    desc: `Requirements
- 2+ years in security operations
- SIEM and incident response
- CompTIA Security+ required
- U.S. citizenship required

On-site in Arlington, VA. $95,000-$115,000.` },
  { id: 1110, type: 'job', title: 'Data Analyst', org: 'Nordlys Data', loc: 'Remote - EMEA', d: 3, sal: null, src: 'Adzuna', url: 'https://www.adzuna.com/details/4481777010',
    desc: `Nordlys Data is a Copenhagen analytics firm. Remote (EMEA only). 2+ years of SQL and Power BI.` },
  // ------------------------------------------------------------ FELLOWSHIPS / PROGRAMS
  { id: 1111, type: 'college', title: 'Data & Society Summer Fellowship', org: 'Ridgeline Institute', loc: 'Remote', d: 9, dl: 3, sal: null, src: 'Company site', url: 'https://ridgelineinstitute.org/fellowship',
    desc: `A 10-week paid fellowship for undergraduates interested in data and public policy. Fellows complete a research project with a mentor. Research methods, data analysis in Python or R. $7,500 stipend.` },
  { id: 1112, type: 'college', title: 'Software Engineering Fellowship', org: 'Ashgrove Institute', loc: 'Remote', d: 12, dl: 21, sal: null, src: 'Company site', url: 'https://ashgroveinstitute.org/swe-fellowship',
    desc: `A 12-week fellowship for new graduates and career switchers. Build production backend services in Python with mentorship. Stipend provided.` },
  { id: 1113, type: 'college', title: 'Undergraduate Research Grant - Applied Data Science', org: 'Whitfield University', loc: 'Remote', d: 18, dl: 45, sal: null, src: 'Company site', url: 'https://whitfield.edu/research-grants',
    desc: `Funding for undergraduates to pursue an applied data science research project. Python, statistics. Faculty mentor required.` },
  { id: 1114, type: 'college', title: 'Tech Policy & Data Ethics Fellowship', org: 'Carrow Center', loc: 'Washington, DC', d: 25, dl: 60, sal: null, src: 'Company site', url: 'https://carrowcenter.org/fellowship',
    desc: `A one-year fellowship on tech policy and data ethics for recent graduates. Policy research and writing.` },
  ];

  var now = Date.now(), H = 3600000, D = 86400000;
  var corpus = J.map(function (j) {
    var hourOff = (j.id * 37) % 20;
    var posted = new Date(now - j.d * D - hourOff * H).toISOString();
    var lastSeen = new Date(now - (j.seen != null ? j.seen * D : (6 + (j.id % 5)) * H)).toISOString();
    var o = {
      id: j.id, type: j.type, title: j.title, org: j.org, loc: j.loc, description: j.desc,
      postedAt: posted, firstSeenAt: posted, lastSeenAt: lastSeen, source: j.src, applyUrl: j.url, demo: true, tags: [],
    };
    if (j.sal) { o.salaryMin = j.sal[0]; o.salaryMax = j.sal[1]; o.salaryPeriod = j.sal[2] || 'year'; o.salaryIsPredicted = !!j.salPred; }
    // programs with a real application deadline (dl = days from now, as a date)
    if (j.dl != null) o.deadline = new Date(now + j.dl * D).toISOString().slice(0, 10);
    return o;
  });
  root.KAIDO_JOB_CORPUS = corpus;
  if (typeof module !== 'undefined' && module.exports) module.exports = corpus;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
