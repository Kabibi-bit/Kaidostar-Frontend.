/* ============================================================================
   Kaidostar Job Search v2 - "Proof Match" engine.

   Every number this engine produces can be traced to a sentence in the job
   posting and (where it rewards you) a line from your own resume. Nothing is
   remapped to look better: a 62 is a 62, and the reasons it isn't higher are
   listed next to it.

   Mirrored exactly by kaidostar-backend/app/services/job_engine.py so a job
   scores the same in the browser and on the server (auto-apply, alerts).
   The taxonomy block below is GENERATED from app/services/job_taxonomy.py by
   scripts/gen_job_taxonomy_js.py - edit the Python file, then regenerate.

   Pure functions only: no DOM, no storage, no network, no clock. Callers pass
   `now` (ms) in, so results are reproducible and testable.
   ============================================================================ */
(function (root) {
  'use strict';

  var TAX = /* @@TAXONOMY_START@@ */ {"skills":[{"id":"python","name":"Python","family":null,"kind":"hard","aliases":["python","python3"]},{"id":"r_lang","name":"R","family":"stats_langs","kind":"hard","aliases":["rstudio","tidyverse","r programming","r language"],"pre":["with","in","using","of","or","and"],"cs":["R"],"ctx":["python","sql","stata","sas","spss","statistic","statistical","matlab","programming","data","analysis","tableau","excel","julia","scala"],"implies":["data_analysis"]},{"id":"sas","name":"SAS","family":"stats_langs","kind":"tool","aliases":[],"cs":["SAS"],"ctx":["statistic","statistical","analytics","data","sql","programming","spss","stata","python","r","analysis","clinical"]},{"id":"stata","name":"Stata","family":"stats_langs","kind":"tool","aliases":["stata"]},{"id":"spss","name":"SPSS","family":"stats_langs","kind":"tool","aliases":["spss"]},{"id":"matlab","name":"MATLAB","family":"stats_langs","kind":"tool","aliases":["matlab"]},{"id":"java","name":"Java","family":"jvm_langs","kind":"hard","aliases":["java","java 8","java 11","java 17"]},{"id":"kotlin","name":"Kotlin","family":"jvm_langs","kind":"hard","aliases":["kotlin"]},{"id":"scala","name":"Scala","family":"jvm_langs","kind":"hard","aliases":["scala"]},{"id":"javascript","name":"JavaScript","family":null,"kind":"hard","aliases":["javascript","java script","es6","ecmascript","vanilla js"],"cs":["JS"],"ctx":["html","css","react","node","typescript","frontend","front-end","web","angular","vue"]},{"id":"typescript","name":"TypeScript","family":null,"kind":"hard","aliases":["typescript"],"implies":["javascript"]},{"id":"go_lang","name":"Go","family":null,"kind":"hard","aliases":["golang"],"neg":["to","live","beyond","above","after","back","out","through","get"],"pre":["with","in","using","or","and"],"cs":["Go"],"ctx":["python","java","rust","c++","kubernetes","microservices","backend","back-end","services","language","languages","programming","grpc","distributed"]},{"id":"rust","name":"Rust","family":null,"kind":"hard","aliases":[],"pre":["with","in","using","or","and"],"cs":["Rust"],"ctx":["c++","go","golang","python","systems","language","languages","programming","memory","performance","backend","webassembly"]},{"id":"cpp","name":"C++","family":"c_langs","kind":"hard","aliases":["c++","cpp"]},{"id":"c_lang","name":"C","family":"c_langs","kind":"hard","aliases":["ansi c"],"cs":["C"],"ctx":["c++","embedded","firmware","linux","kernel","assembly","microcontroller","programming","language","languages","rtos"]},{"id":"csharp","name":"C#","family":null,"kind":"hard","aliases":["c#","csharp","c sharp"]},{"id":"dotnet","name":".NET","family":null,"kind":"tool","aliases":[".net","dotnet","asp.net",".net core","asp.net core"],"implies":["csharp"]},{"id":"ruby","name":"Ruby","family":null,"kind":"hard","aliases":[],"cs":["Ruby"],"ctx":["rails","python","javascript","programming","language","languages","backend","back-end","web"]},{"id":"rails","name":"Ruby on Rails","family":"backend_frameworks","kind":"tool","aliases":["ruby on rails","rails"],"implies":["ruby"]},{"id":"php","name":"PHP","family":null,"kind":"hard","aliases":["php","laravel"]},{"id":"swift","name":"Swift","family":"mobile_langs","kind":"hard","aliases":["swiftui"],"cs":["Swift"],"ctx":["ios","xcode","objective-c","apple","mobile","uikit","macos","iphone"]},{"id":"objective_c","name":"Objective-C","family":"mobile_langs","kind":"hard","aliases":["objective-c","objective c","objc"]},{"id":"html_css","name":"HTML/CSS","family":null,"kind":"hard","aliases":["html","css","html5","css3","sass","scss","tailwind","tailwind css"]},{"id":"bash","name":"Shell scripting","family":null,"kind":"hard","aliases":["bash","shell scripting","shell scripts","powershell","zsh"]},{"id":"react","name":"React","family":"frontend_frameworks","kind":"tool","aliases":["react","reactjs","react.js","react native","redux"],"implies":["javascript"]},{"id":"angular","name":"Angular","family":"frontend_frameworks","kind":"tool","aliases":["angular","angularjs"],"implies":["javascript"]},{"id":"vue","name":"Vue","family":"frontend_frameworks","kind":"tool","aliases":["vue","vue.js","vuejs","nuxt"],"implies":["javascript"]},{"id":"svelte","name":"Svelte","family":"frontend_frameworks","kind":"tool","aliases":["svelte","sveltekit"],"implies":["javascript"]},{"id":"nextjs","name":"Next.js","family":"frontend_frameworks","kind":"tool","aliases":["next.js","nextjs"],"implies":["react","javascript"]},{"id":"nodejs","name":"Node.js","family":"backend_frameworks","kind":"tool","aliases":["node.js","nodejs","node js","express.js","expressjs","nestjs"],"implies":["javascript"]},{"id":"django","name":"Django","family":"backend_frameworks","kind":"tool","aliases":["django"],"implies":["python"]},{"id":"flask","name":"Flask","family":"backend_frameworks","kind":"tool","aliases":["flask"],"implies":["python"]},{"id":"fastapi","name":"FastAPI","family":"backend_frameworks","kind":"tool","aliases":["fastapi"],"implies":["python"]},{"id":"spring","name":"Spring","family":"backend_frameworks","kind":"tool","aliases":["spring boot","springboot","spring framework"],"implies":["java"]},{"id":"rest_apis","name":"REST APIs","family":"api_design","kind":"hard","aliases":["rest api","rest apis","restful","restful apis","api design","web services","rest services","apis","api","api integrations"]},{"id":"graphql","name":"GraphQL","family":"api_design","kind":"tool","aliases":["graphql"]},{"id":"grpc","name":"gRPC","family":"api_design","kind":"tool","aliases":["grpc","protobuf","protocol buffers"]},{"id":"microservices","name":"Microservices","family":null,"kind":"hard","aliases":["microservices","microservice architecture","service-oriented architecture","distributed systems"]},{"id":"ios","name":"iOS development","family":"mobile_platforms","kind":"hard","aliases":["ios development","ios apps","ios app","uikit","xcode"]},{"id":"android","name":"Android development","family":"mobile_platforms","kind":"hard","aliases":["android development","android apps","android app","android sdk","jetpack compose"]},{"id":"flutter","name":"Flutter","family":"mobile_platforms","kind":"tool","aliases":["flutter","dart"]},{"id":"unity","name":"Unity","family":"game_engines","kind":"tool","aliases":["unity3d","unity engine"],"cs":["Unity"],"ctx":["game","games","c#","3d","unreal","vr","ar","engine","gameplay"]},{"id":"unreal","name":"Unreal Engine","family":"game_engines","kind":"tool","aliases":["unreal engine","unreal","ue5","ue4"]},{"id":"sql","name":"SQL","family":null,"kind":"hard","aliases":["sql","t-sql","tsql","pl/sql","structured query language","sql queries","writing queries"],"implies":["data_analysis"]},{"id":"data_analysis","name":"Data analysis","family":null,"kind":"hard","aliases":["data analysis","data analytics","analyzing data","analysing data","analyze data","analyse data","quantitative analysis","business analytics","analytical reporting"],"list":["analytics"]},{"id":"postgresql","name":"PostgreSQL","family":"databases","kind":"tool","aliases":["postgresql","postgres"],"implies":["sql"]},{"id":"mysql","name":"MySQL","family":"databases","kind":"tool","aliases":["mysql","mariadb"],"implies":["sql"]},{"id":"sql_server","name":"SQL Server","family":"databases","kind":"tool","aliases":["sql server","mssql","ms sql","ssms","ssis","ssrs"],"implies":["sql"]},{"id":"oracle_db","name":"Oracle Database","family":"databases","kind":"tool","aliases":["oracle database","oracle db","oracle sql"],"implies":["sql"]},{"id":"sqlite","name":"SQLite","family":"databases","kind":"tool","aliases":["sqlite"],"implies":["sql"]},{"id":"mongodb","name":"MongoDB","family":"nosql","kind":"tool","aliases":["mongodb","mongo"]},{"id":"dynamodb","name":"DynamoDB","family":"nosql","kind":"tool","aliases":["dynamodb"]},{"id":"cassandra","name":"Cassandra","family":"nosql","kind":"tool","aliases":["cassandra"]},{"id":"redis","name":"Redis","family":"nosql","kind":"tool","aliases":["redis","memcached"]},{"id":"elasticsearch","name":"Elasticsearch","family":"nosql","kind":"tool","aliases":["elasticsearch","elastic search","opensearch"]},{"id":"snowflake","name":"Snowflake","family":"warehouses","kind":"tool","aliases":[],"pre":["with","in","using","or","and"],"cs":["Snowflake"],"ctx":["sql","data","warehouse","warehousing","dbt","bigquery","redshift","databricks","etl","analytics","pipelines","airflow","kafka","spark","looker","tableau","fivetran"],"implies":["sql"]},{"id":"bigquery","name":"BigQuery","family":"warehouses","kind":"tool","aliases":["bigquery","big query"],"implies":["sql"]},{"id":"redshift","name":"Redshift","family":"warehouses","kind":"tool","aliases":["redshift","amazon redshift"],"implies":["sql"]},{"id":"databricks","name":"Databricks","family":"warehouses","kind":"tool","aliases":["databricks","delta lake"]},{"id":"data_warehousing","name":"Data warehousing","family":null,"kind":"hard","aliases":["data warehouse","data warehousing","data warehouses","data lake","data lakes","lakehouse"]},{"id":"etl","name":"ETL / data pipelines","family":null,"kind":"hard","aliases":["etl","elt","data pipeline","data pipelines","etl pipelines","pipelines for data","data ingestion"]},{"id":"data_modeling","name":"Data modeling","family":null,"kind":"hard","aliases":["data modeling","data modelling","dimensional modeling","star schema","schema design"]},{"id":"dbt","name":"dbt","family":null,"kind":"tool","aliases":["data build tool","dbt cloud","dbt core","dbt models","dbt labs"],"implies":["sql"],"cs":["dbt","DBT"],"ctx":["sql","snowflake","bigquery","redshift","databricks","warehouse","data","analytics","airflow","looker","elt","etl","models","modeling","pipelines","python","dagster","fivetran"]},{"id":"airflow","name":"Airflow","family":"orchestration","kind":"tool","aliases":["apache airflow","airflow"]},{"id":"prefect","name":"Prefect / Dagster","family":"orchestration","kind":"tool","aliases":["prefect","dagster","luigi"]},{"id":"spark","name":"Spark","family":"big_data","kind":"tool","aliases":["apache spark","pyspark","spark sql"],"cs":["Spark"],"ctx":["data","hadoop","scala","python","databricks","etl","big","distributed","pipelines","sql"]},{"id":"hadoop","name":"Hadoop","family":"big_data","kind":"tool","aliases":["hadoop","hive","hdfs","mapreduce"]},{"id":"kafka","name":"Kafka","family":"streaming","kind":"tool","aliases":["kafka","apache kafka","kinesis","pub/sub","pubsub","rabbitmq"]},{"id":"pandas","name":"pandas","family":null,"kind":"tool","aliases":["pandas","numpy","scipy","jupyter","jupyter notebooks"],"implies":["python","data_analysis"]},{"id":"excel","name":"Excel","family":"spreadsheets","kind":"tool","aliases":["microsoft excel","ms excel","excel spreadsheets","advanced excel","excel modeling","vlookup","pivot tables","pivot table","xlookup"],"cs":["Excel"],"ctx":[],"neg":["at","in","as","under","when"]},{"id":"google_sheets","name":"Google Sheets","family":"spreadsheets","kind":"tool","aliases":["google sheets","gsheets"]},{"id":"vba","name":"VBA / macros","family":null,"kind":"tool","aliases":["vba","excel macros","macros"],"implies":["excel"]},{"id":"tableau","name":"Tableau","family":"bi_tools","kind":"tool","aliases":["tableau"],"implies":["data_viz"]},{"id":"power_bi","name":"Power BI","family":"bi_tools","kind":"tool","aliases":["power bi","powerbi","dax"],"implies":["data_viz"]},{"id":"looker","name":"Looker","family":"bi_tools","kind":"tool","aliases":["looker","lookml","looker studio","google data studio"],"implies":["data_viz"]},{"id":"qlik","name":"Qlik / other BI","family":"bi_tools","kind":"tool","aliases":["qlik","qlikview","qlik sense","metabase","mode analytics","sisense","domo"],"implies":["data_viz"]},{"id":"data_viz","name":"Data visualization","family":null,"kind":"hard","aliases":["data visualization","data visualisation","dashboards","dashboard","dashboarding","reporting dashboards","visualize data"]},{"id":"statistics","name":"Statistics","family":null,"kind":"hard","aliases":["statistics","statistical analysis","statistical modeling","statistical methods","regression analysis","regression models","regression modeling","linear regression","logistic regression","hypothesis testing","inferential statistics","probability"],"implies":["data_analysis"]},{"id":"experimentation","name":"A/B testing","family":null,"kind":"hard","aliases":["a/b testing","a/b tests","a/b test","ab testing","split testing","experimentation","controlled experiments","experiment design","multivariate testing"]},{"id":"machine_learning","name":"Machine learning","family":null,"kind":"hard","aliases":["machine learning","ml models","ml model","predictive modeling","predictive models","supervised learning","unsupervised learning","classification models","recommendation systems","recommender systems"]},{"id":"deep_learning","name":"Deep learning","family":null,"kind":"hard","aliases":["deep learning","neural networks","neural network","transformer models","convolutional neural networks","cnns"],"implies":["machine_learning"]},{"id":"nlp","name":"NLP","family":null,"kind":"hard","aliases":["nlp","natural language processing","large language models","llms","llm","text classification"],"implies":["machine_learning"]},{"id":"computer_vision","name":"Computer vision","family":null,"kind":"hard","aliases":["computer vision","image recognition","object detection","opencv"],"implies":["machine_learning"]},{"id":"pytorch","name":"PyTorch","family":"ml_frameworks","kind":"tool","aliases":["pytorch","torch"],"implies":["python","deep_learning"]},{"id":"tensorflow","name":"TensorFlow","family":"ml_frameworks","kind":"tool","aliases":["tensorflow","keras"],"implies":["python","deep_learning"]},{"id":"scikit_learn","name":"scikit-learn","family":"ml_frameworks","kind":"tool","aliases":["scikit-learn","sklearn","scikit learn","xgboost","lightgbm"],"implies":["python","machine_learning"]},{"id":"mlops","name":"MLOps","family":null,"kind":"hard","aliases":["mlops","model deployment","mlflow","kubeflow","sagemaker","vertex ai","feature store"],"implies":["machine_learning"]},{"id":"product_analytics_tools","name":"Product analytics (Amplitude/Mixpanel)","family":"product_analytics","kind":"tool","aliases":["amplitude","mixpanel","heap analytics","pendo","posthog","fullstory"]},{"id":"google_analytics","name":"Google Analytics","family":"product_analytics","kind":"tool","aliases":["google analytics","ga4","google tag manager","adobe analytics"]},{"id":"aws","name":"AWS","family":"cloud","kind":"tool","aliases":["aws","amazon web services","ec2","s3","lambda functions","aws lambda","cloudwatch"]},{"id":"gcp","name":"Google Cloud","family":"cloud","kind":"tool","aliases":["google cloud","google cloud platform"],"cs":["GCP"],"ctx":["aws","azure","cloud","kubernetes","bigquery","terraform","docker","google","gke","infrastructure","devops"]},{"id":"azure","name":"Azure","family":"cloud","kind":"tool","aliases":["azure","microsoft azure"]},{"id":"docker","name":"Docker","family":"containers","kind":"tool","aliases":["docker","containerization","containerized","docker compose"]},{"id":"kubernetes","name":"Kubernetes","family":"containers","kind":"tool","aliases":["kubernetes","k8s","helm charts","eks","gke","aks"]},{"id":"terraform","name":"Terraform / IaC","family":null,"kind":"tool","aliases":["terraform","infrastructure as code","cloudformation","pulumi","ansible"]},{"id":"ci_cd","name":"CI/CD","family":null,"kind":"hard","aliases":["ci/cd","cicd","continuous integration","continuous delivery","continuous deployment","github actions","jenkins","gitlab ci","circleci"]},{"id":"linux","name":"Linux","family":null,"kind":"tool","aliases":["linux","unix","ubuntu","red hat","rhel","centos"]},{"id":"git","name":"Git","family":null,"kind":"tool","aliases":["github","gitlab","bitbucket","version control","git version control","git workflows"],"cs":["Git","git"]},{"id":"monitoring","name":"Observability","family":"observability","kind":"hard","aliases":["observability","monitoring and alerting","application monitoring","infrastructure monitoring"]},{"id":"datadog","name":"Datadog","family":"observability","kind":"tool","aliases":["datadog"],"implies":["monitoring"]},{"id":"prometheus","name":"Prometheus","family":"observability","kind":"tool","aliases":["prometheus"],"implies":["monitoring"]},{"id":"grafana","name":"Grafana","family":"observability","kind":"tool","aliases":["grafana"],"implies":["monitoring"]},{"id":"splunk","name":"Splunk","family":"observability","kind":"tool","aliases":["splunk"],"implies":["monitoring"]},{"id":"new_relic","name":"New Relic","family":"observability","kind":"tool","aliases":["new relic","newrelic"],"implies":["monitoring"]},{"id":"pagerduty","name":"PagerDuty","family":"observability","kind":"tool","aliases":["pagerduty"],"implies":["monitoring"]},{"id":"networking","name":"Networking","family":null,"kind":"hard","aliases":["tcp/ip","dns","network administration","networking fundamentals","lan/wan","firewalls","vpn","cisco","routing and switching"]},{"id":"cybersecurity","name":"Security","family":null,"kind":"hard","aliases":["cybersecurity","cyber security","information security","infosec","security operations","vulnerability management","penetration testing","threat detection","incident response","siem","soc 2","iso 27001","nist"]},{"id":"testing_qa","name":"Software testing / QA","family":null,"kind":"hard","aliases":["unit testing","integration testing","jest","pytest","junit","regression testing","manual testing","software testing","software quality assurance","qa testing","test case design","exploratory testing","api testing","end-to-end testing","e2e testing","cross-browser testing","testng"]},{"id":"system_design","name":"System design","family":null,"kind":"hard","aliases":["system design","systems design","software architecture","scalable systems","scalability"],"not":["thermal system design","thermal systems design","mechanical system design","mechanical systems design","hvac system design","hvac systems design","electrical system design","electrical systems design","cooling system design","battery system design","power system design","power systems design","hydraulic system design","fluid system design","plumbing system design","piping system design","control system design","control systems design","fire protection system design"]},{"id":"algorithms","name":"Data structures & algorithms","family":null,"kind":"hard","aliases":["data structures","algorithms","computer science fundamentals","cs fundamentals"]},{"id":"it_support","name":"IT support","family":null,"kind":"hard","aliases":["help desk","helpdesk","technical support","desktop support","troubleshooting hardware","active directory","ticketing system","servicenow","microsoft 365 administration","office 365 administration","m365 administration","exchange online","intune","azure ad","azure active directory","entra id"]},{"id":"embedded","name":"Embedded systems","family":null,"kind":"hard","aliases":["embedded systems","embedded software","firmware","microcontrollers","rtos","fpga"]},{"id":"cad","name":"CAD","family":"cad_tools","kind":"tool","aliases":["cad","autocad","revit","fusion 360","cad software","computer-aided design"]},{"id":"product_management","name":"Product management","family":null,"kind":"hard","aliases":["product management","product strategy","product roadmap","product roadmaps","roadmapping","roadmap planning","prioritization frameworks","product lifecycle","go-to-market strategy","product requirements","prds","prd"]},{"id":"user_research","name":"User research","family":null,"kind":"hard","aliases":["user research","user interviews","usability testing","customer interviews","ux research","user testing","customer discovery","qualitative research","diary studies","diary study","contextual inquiry","card sorting","tree testing","moderated usability testing","unmoderated testing","research synthesis"]},{"id":"agile","name":"Agile / Scrum","family":null,"kind":"hard","aliases":["agile","scrum","kanban","sprint planning","agile methodologies","safe agile"]},{"id":"jira","name":"Jira / Asana","family":"project_tools","kind":"tool","aliases":["jira","confluence","asana","trello","monday.com","smartsheet","clickup"]},{"id":"project_management","name":"Project management","family":null,"kind":"hard","aliases":["project management","project planning","project coordination","managing projects","manage projects","project timelines","program management","ms project","microsoft project","gantt"]},{"id":"stakeholder_mgmt","name":"Stakeholder management","family":null,"kind":"hard","aliases":["stakeholder management","stakeholder communication","cross-functional collaboration","cross-functional teams","cross-functional partners","managing stakeholders","executive stakeholders"]},{"id":"process_improvement","name":"Process improvement","family":null,"kind":"hard","aliases":["process improvement","process optimization","continuous improvement","lean manufacturing","six sigma","lean six sigma","kaizen","root cause analysis","workflow optimization"]},{"id":"requirements","name":"Requirements gathering","family":null,"kind":"hard","aliases":["requirements gathering","business requirements","requirements documentation","user stories","functional requirements","process mapping","use cases"]},{"id":"figma","name":"Figma","family":"design_tools","kind":"tool","aliases":["figma","figjam"]},{"id":"sketch_xd","name":"Sketch / Adobe XD","family":"design_tools","kind":"tool","aliases":["adobe xd","invision","axure","framer"],"cs":["Sketch"],"ctx":["figma","design","invision","prototype","prototyping","ui","ux","xd"]},{"id":"adobe_cc","name":"Adobe Creative Suite","family":"creative_tools","kind":"tool","aliases":["adobe creative suite","adobe creative cloud","photoshop","illustrator","indesign","after effects","premiere pro","lightroom"]},{"id":"canva","name":"Canva","family":"creative_tools","kind":"tool","aliases":["canva"]},{"id":"ux_design","name":"UX design","family":null,"kind":"hard","aliases":["ux design","user experience design","interaction design","user flows","wireframing","wireframes","information architecture","journey mapping","human-centered design","ux/ui","ui/ux"]},{"id":"ui_design","name":"UI / visual design","family":null,"kind":"hard","aliases":["ui design","visual design","interface design","typography","high-fidelity mockups","mockups","user interface design","high-fidelity designs","high fidelity designs","hi-fi designs","hi-fi mockups","pixel-perfect","shipped ui","ui components"]},{"id":"product_design","name":"Product design (UX + UI)","family":null,"kind":"hard","aliases":["product design","end-to-end product design","end-to-end design"],"implies":["ux_design","ui_design"]},{"id":"prototyping","name":"Prototyping","family":null,"kind":"hard","aliases":["prototyping","prototypes","interactive prototypes","rapid prototyping"]},{"id":"graphic_design","name":"Graphic design","family":null,"kind":"hard","aliases":["graphic design","branding design","layout design","print design","logo design","brand identity"]},{"id":"motion_design","name":"Motion / video","family":null,"kind":"hard","aliases":["motion design","motion graphics","video editing","animation","video production"]},{"id":"accessibility","name":"Accessibility","family":null,"kind":"hard","aliases":["accessibility","wcag","a11y","ada compliance"]},{"id":"seo","name":"SEO","family":null,"kind":"hard","aliases":["seo","search engine optimization","keyword research","ahrefs","semrush","moz"]},{"id":"sem","name":"Paid search (SEM/PPC)","family":"paid_media","kind":"hard","aliases":["sem","ppc","paid search","google ads","google adwords","adwords","bing ads","microsoft ads","search ads"]},{"id":"paid_social","name":"Paid social ads","family":"paid_media","kind":"hard","aliases":["paid social","meta ads","facebook ads","instagram ads","tiktok ads","linkedin ads","social ads","paid social media"]},{"id":"performance_marketing","name":"Performance marketing / media buying","family":"paid_media","kind":"hard","aliases":["performance marketing","media buying","paid media","paid acquisition"]},{"id":"content_marketing","name":"Content marketing","family":null,"kind":"hard","aliases":["content marketing","content strategy","editorial calendar","blog posts","thought leadership","content creation"]},{"id":"social_media","name":"Social media","family":null,"kind":"hard","aliases":["social media","social media marketing","social media management","community management","instagram","tiktok","social channels","hootsuite","sprout social"]},{"id":"email_marketing","name":"Email marketing","family":"marketing_automation","kind":"hard","aliases":["email marketing","email campaigns","lifecycle marketing","drip campaigns","newsletters"]},{"id":"braze","name":"Braze","family":"marketing_automation","kind":"tool","aliases":["braze"],"implies":["email_marketing"]},{"id":"iterable","name":"Iterable","family":"marketing_automation","kind":"tool","aliases":[],"cs":["Iterable"],"ctx":["email","braze","lifecycle","crm","marketing","klaviyo","campaigns","platform"],"implies":["email_marketing"]},{"id":"klaviyo","name":"Klaviyo","family":"marketing_automation","kind":"tool","aliases":["klaviyo"],"implies":["email_marketing"]},{"id":"mailchimp","name":"Mailchimp","family":"marketing_automation","kind":"tool","aliases":["mailchimp"],"implies":["email_marketing"]},{"id":"marketing_automation","name":"Marketing automation","family":"marketing_automation","kind":"tool","aliases":["marketing automation","marketo","pardot","hubspot marketing","eloqua"]},{"id":"hubspot","name":"HubSpot","family":"crm","kind":"tool","aliases":["hubspot"],"implies":["marketing_automation"]},{"id":"copywriting","name":"Copywriting","family":null,"kind":"hard","aliases":["copywriting","copy writing","ad copy","marketing copy","web copy"]},{"id":"brand_marketing","name":"Brand marketing","family":null,"kind":"hard","aliases":["brand marketing","brand strategy","brand management","brand campaigns","integrated campaigns","campaign management","marketing campaigns"]},{"id":"growth_marketing","name":"Growth marketing","family":null,"kind":"hard","aliases":["growth marketing","user acquisition","customer acquisition","funnel optimization","conversion rate optimization","cro","retention marketing","acquisition funnel"]},{"id":"product_marketing","name":"Product marketing","family":null,"kind":"hard","aliases":["product marketing","positioning and messaging","messaging and positioning","product positioning","product launches","competitive analysis","go-to-market","gtm"]},{"id":"market_research","name":"Market research","family":null,"kind":"hard","aliases":["market research","competitive research","market analysis","survey design","consumer insights","focus groups","customer surveys","market surveys","survey research","consumer surveys","user surveys"],"not":["salary surveys","salary survey","compensation surveys","compensation survey","engagement surveys","engagement survey","employee surveys","pulse surveys","site surveys","land surveys"]},{"id":"pr_comms","name":"PR / communications","family":null,"kind":"hard","aliases":["public relations","media relations","press releases","corporate communications","internal communications","press outreach"]},{"id":"event_planning","name":"Event planning","family":null,"kind":"hard","aliases":["event planning","event management","events coordination","trade shows","conferences and events"]},{"id":"salesforce","name":"Salesforce","family":"crm","kind":"tool","aliases":["salesforce","sfdc","salesforce crm"]},{"id":"crm","name":"CRM tools","family":"crm","kind":"tool","aliases":["crm","crm software","pipedrive","zoho crm","microsoft dynamics","dynamics 365"]},{"id":"prospecting","name":"Prospecting","family":null,"kind":"hard","aliases":["prospecting","cold calling","cold outreach","cold emailing","outbound prospecting","lead generation","lead qualification","outbound sales","sales outreach","outreach.io","salesloft","linkedin sales navigator"],"implies":["b2b_sales"]},{"id":"closing","name":"Closing / quota sales","family":"sales_motion","kind":"hard","aliases":["closing deals","close deals","full-cycle sales","full sales cycle","quota attainment","exceeded quota","met quota","sales quota","quota-carrying","pipeline management","deal negotiation","solution selling"]},{"id":"account_management","name":"Account management","family":null,"kind":"hard","aliases":["account management","managing accounts","client relationships","relationship management","upselling","upsell","cross-sell","renewals","client retention","book of business"]},{"id":"customer_success","name":"Customer success","family":null,"kind":"hard","aliases":["customer success","customer onboarding","client onboarding","churn reduction","customer retention","customer health scores","qbrs","quarterly business reviews","customer implementations"]},{"id":"customer_support","name":"Customer support","family":null,"kind":"hard","aliases":["customer support","customer service","support tickets","ticket resolution","live chat support","phone support","escalations","troubleshooting customer issues","client support"]},{"id":"support_tools","name":"Zendesk / help desk tools","family":"support_tools","kind":"tool","aliases":["zendesk","intercom","freshdesk","help scout","gorgias","salesforce service cloud","help desk software","help desk tool","help desk tools","helpdesk software","ticketing tools","ticketing software"]},{"id":"negotiation","name":"Negotiation","family":null,"kind":"hard","aliases":["negotiation","negotiating","contract negotiation","vendor negotiation"]},{"id":"financial_modeling","name":"Financial modeling","family":null,"kind":"hard","aliases":["financial modeling","financial modelling","financial models","three-statement model","3-statement model","dcf","discounted cash flow","lbo","merger models"]},{"id":"valuation","name":"Valuation","family":null,"kind":"hard","aliases":["valuation","valuations","comparable company analysis","comps","precedent transactions"]},{"id":"fpa","name":"FP&A / budgeting","family":null,"kind":"hard","aliases":["fp&a","financial planning and analysis","financial planning & analysis","budgeting","budgeting and forecasting","financial forecasting","variance analysis","budget vs actual","annual operating plan","financial planning"]},{"id":"forecasting","name":"Forecasting","family":null,"kind":"hard","aliases":["forecasting","forecasts","forecasting models","time series forecasting","time-series forecasting","time series","time-series","demand forecasting"]},{"id":"accounting","name":"Accounting","family":null,"kind":"hard","aliases":["accounting","general ledger","journal entries","reconciliations","account reconciliation","accounts payable","accounts receivable","month-end close","month end close","financial statements","gaap","us gaap","ifrs","accruals"]},{"id":"audit","name":"Audit","family":"audit_fam","kind":"hard","aliases":["audit","audits","auditing","internal audit","external audit"],"not":["audit and feedback","audits and feedback","audit committee","audit committees"]},{"id":"sox","name":"SOX / internal controls","family":"audit_fam","kind":"hard","aliases":["sox","sox compliance","sarbanes-oxley","sarbanes oxley","internal controls","icfr","internal control over financial reporting"]},{"id":"tax","name":"Tax","family":null,"kind":"hard","aliases":["tax preparation","tax returns","tax compliance","corporate tax","individual tax","taxation","tax planning","tax provision","tax research","tax software","tax accounting","tax experience","partnership tax","partnership taxation","partnership returns","form 1065","form 1120","form 1040"]},{"id":"accounting_software","name":"QuickBooks / NetSuite","family":"accounting_tools","kind":"tool","aliases":["quickbooks","netsuite","xero","sage intacct","oracle financials"]},{"id":"erp","name":"ERP (SAP/Oracle)","family":"erp_tools","kind":"tool","aliases":["erp","sap","oracle erp","sap s/4hana","workday financials"]},{"id":"bloomberg","name":"Bloomberg / CapIQ","family":null,"kind":"tool","aliases":["bloomberg terminal","capital iq","capiq","factset","pitchbook"]},{"id":"investment_research","name":"Investment research","family":null,"kind":"hard","aliases":["investment research","due diligence","equity research","portfolio analysis","investment memos","deal sourcing"]},{"id":"payroll","name":"Payroll","family":null,"kind":"hard","aliases":["payroll","payroll processing","adp","gusto","paychex"]},{"id":"risk_management","name":"Risk management","family":null,"kind":"hard","domain":true,"aliases":["risk management","risk assessment","enterprise risk","credit risk","operational risk","risk analysis","kyc","aml","anti-money laundering"]},{"id":"recruiting_coordination","name":"Recruiting coordination","family":null,"kind":"hard","aliases":["recruiting coordination","recruiting coordinator","interview scheduling","interview coordination","candidate scheduling","scheduling interviews"]},{"id":"recruiting","name":"Recruiting","family":null,"kind":"hard","aliases":["recruiting","recruitment","full-cycle recruiting","full cycle recruiting","talent acquisition","sourcing candidates","candidate sourcing","phone screens","boolean search"],"not":["recruiting participants","recruiting research participants","recruiting study participants","recruiting users","recruiting patients","recruiting subjects","participant recruiting","participant recruitment","patient recruitment","recruitment of participants","recruitment of study participants","recruiting and scheduling participants"]},{"id":"ats_tools","name":"ATS (Greenhouse/Lever)","family":"hr_tools","kind":"tool","aliases":["greenhouse","lever","applicant tracking system","applicant tracking systems","icims","taleo","ashby","workable","smartrecruiters"]},{"id":"hris","name":"HRIS (Workday/BambooHR)","family":"hr_tools","kind":"tool","aliases":["hris","workday","bamboohr","rippling","ukg","successfactors","namely"]},{"id":"employee_relations","name":"Employee relations","family":null,"kind":"hard","aliases":["employee relations","employee engagement","performance management","workplace investigations","employee investigations","hr investigations","employment law","hr policies","hr compliance","benefits administration","compensation and benefits","onboarding and offboarding","onboarding new hires"]},{"id":"training","name":"Training & facilitation","family":null,"kind":"hard","aliases":["training and development","learning and development","l&d","facilitation","workshop facilitation","training programs","coaching and mentoring"]},{"id":"supply_chain","name":"Supply chain","family":null,"kind":"hard","aliases":["supply chain","supply chain management","demand planning","supply planning","s&op","sourcing strategy","supplier management"]},{"id":"logistics","name":"Logistics","family":null,"kind":"hard","domain":true,"aliases":["logistics","transportation management","freight","shipping and receiving","warehouse operations","distribution center","last-mile","fleet management","3pl"],"not":["meeting logistics","event logistics","travel logistics","trip logistics","conference logistics","offsite logistics","logistics for meetings","logistics for events","logistics of meetings","logistics of events"]},{"id":"procurement","name":"Procurement","family":null,"kind":"hard","aliases":["procurement","purchasing","purchase orders","strategic sourcing","rfp","rfps","contract management"]},{"id":"inventory","name":"Inventory management","family":null,"kind":"hard","aliases":["inventory management","inventory control","inventory planning","cycle counts","stock levels"]},{"id":"operations_mgmt","name":"Operations management","family":null,"kind":"hard","aliases":["operations management","operational excellence","sops","standard operating procedures","capacity planning","workforce scheduling","operational metrics"]},{"id":"data_entry","name":"Data entry","family":null,"kind":"hard","aliases":["data entry","record keeping","recordkeeping","filing","typing speed"]},{"id":"office_admin","name":"Office administration","family":null,"kind":"hard","aliases":["calendar management","scheduling meetings","office management","travel arrangements","expense reports","administrative support","front desk","phone calls","complex calendars","managing calendars","manage calendars","calendar coordination","calendaring","travel booking","booking travel","travel coordination","coordinating travel","expense reporting","expense management","meeting coordination","board meeting preparation","board materials","board books","meeting minutes","taking minutes","executive support","c-suite support","gatekeeping"]},{"id":"patient_care","name":"Patient care","family":null,"kind":"hard","aliases":["patient care","direct patient care","bedside care","patient assessment","patient assessments","patient education","vital signs","medication administration","care plans","acute care","patient triage","critical care","intensive care","critical care nursing","icu","micu","sicu","cvicu","picu","nicu","med-surg","medical-surgical"]},{"id":"ehr","name":"EHR (Epic/Cerner)","family":"ehr_tools","kind":"tool","aliases":["ehr","emr","electronic health records","electronic medical records","epic","cerner","meditech","athenahealth"]},{"id":"hipaa","name":"HIPAA","family":null,"kind":"hard","aliases":["hipaa","protected health information"]},{"id":"clinical_research","name":"Clinical research","family":null,"kind":"hard","aliases":["clinical research","clinical trials","clinical trial","gcp guidelines","good clinical practice","irb","informed consent","study protocols","case report forms","regulatory binders"]},{"id":"medical_terminology","name":"Medical terminology","family":null,"kind":"hard","aliases":["medical terminology","medical coding","icd-10","cpt codes","medical billing","insurance verification"]},{"id":"phlebotomy","name":"Phlebotomy / clinical skills","family":null,"kind":"hard","aliases":["phlebotomy","venipuncture","ekg","ecg","specimen collection","administering injections"]},{"id":"public_health","name":"Public health","family":null,"kind":"hard","aliases":["public health","epidemiology","health policy","community health","biostatistics"]},{"id":"lab_skills","name":"Lab techniques","family":null,"kind":"hard","aliases":["laboratory techniques","lab techniques","pcr","cell culture","western blot","elisa","wet lab","bench work","assay development","microscopy"]},{"id":"legal_research","name":"Legal research","family":null,"kind":"hard","aliases":["legal research","westlaw","lexisnexis","lexis nexis","case law","legal writing","legal memos"]},{"id":"contracts","name":"Contract drafting","family":null,"kind":"hard","aliases":["contract drafting","drafting contracts","contract review","reviewing contracts","redlining","commercial contracts","contract negotiations support"]},{"id":"corporate_law","name":"Corporate / transactional law","family":null,"kind":"hard","aliases":["corporate law","corporate legal","transactional paralegal","transactional practice","transactional attorney","transactional law","corporate transactions","m&a transactions","mergers and acquisitions","corporate governance","entity management","closing checklists","closing sets","legal due diligence","securities filings","board minutes","corporate paralegal"]},{"id":"litigation","name":"Litigation support","family":null,"kind":"hard","aliases":["litigation","litigation support","legal discovery","e-discovery","ediscovery","document review","court filings","trial preparation","depositions"]},{"id":"compliance","name":"Compliance","family":null,"kind":"hard","aliases":["regulatory compliance","compliance monitoring","compliance programs","regulatory filings","compliance testing","compliance reviews","compliance audits"]},{"id":"teaching","name":"Teaching","family":null,"kind":"hard","aliases":["teaching experience","classroom teaching","classroom instruction","lesson planning","lesson plans","classroom management","differentiated instruction","student assessment","experience teaching","years teaching","teaching secondary","teaching middle school","teaching high school","teaching elementary","grading papers","grading assignments","grading student work"]},{"id":"tutoring","name":"Tutoring","family":null,"kind":"hard","aliases":["tutoring","tutor","mentoring students","test prep","academic coaching"]},{"id":"curriculum","name":"Curriculum design","family":"elearning","kind":"hard","aliases":["curriculum development","curriculum design","instructional design","learning design","course design","curriculum writing","writing curriculum","standards-aligned curriculum","course development","curriculum mapping","unit planning"]},{"id":"elearning_dev","name":"E-learning development","family":"elearning","kind":"hard","aliases":["e-learning","elearning","e-learning development","elearning development","online course development"]},{"id":"articulate","name":"Articulate Storyline / 360","family":"elearning","kind":"tool","aliases":["articulate storyline","articulate 360","storyline 360","articulate rise","rise 360"],"implies":["elearning_dev"]},{"id":"captivate","name":"Adobe Captivate","family":"elearning","kind":"tool","aliases":["adobe captivate"],"implies":["elearning_dev"]},{"id":"lms","name":"LMS administration","family":"elearning","kind":"tool","aliases":["lms","learning management system","learning management systems","moodle","docebo","cornerstone ondemand"]},{"id":"scorm","name":"SCORM / xAPI","family":"elearning","kind":"tool","aliases":["scorm","xapi","tin can api"]},{"id":"technical_writing","name":"Technical writing","family":null,"kind":"hard","aliases":["technical writing","api documentation","technical documentation","knowledge base articles","user guides","docs-as-code","developer documentation"]},{"id":"editing","name":"Editing","family":null,"kind":"hard","aliases":["editing","proofreading","ap style","fact-checking","fact checking","editorial","copyediting","copy editing","copyeditor","copy editor","line editing"]},{"id":"journalism","name":"Reporting / journalism","family":null,"kind":"hard","aliases":["journalism","news writing","reporting and writing","interviewing sources","news reporting"]},{"id":"grant_writing","name":"Grant writing","family":null,"kind":"hard","aliases":["grant writing","grant proposals","fundraising","donor relations","development operations"]},{"id":"research_methods","name":"Research methods","family":null,"kind":"hard","aliases":["research methods","research design","literature review","literature reviews","academic research","data collection","mixed methods"]},{"id":"policy_analysis","name":"Policy analysis","family":null,"kind":"hard","aliases":["policy analysis","policy research","legislative research","policy memos","public policy"]},{"id":"consulting_skills","name":"Consulting / problem structuring","family":null,"kind":"hard","aliases":["case interviews","hypothesis-driven","issue trees","client engagements","management consulting","strategy consulting","business case","market sizing"]},{"id":"presentation_decks","name":"PowerPoint / decks","family":null,"kind":"tool","aliases":["powerpoint","keynote","google slides","slide decks","executive presentations","pitch decks"]},{"id":"hvac","name":"HVAC","family":null,"kind":"hard","aliases":["hvac","refrigeration systems"]},{"id":"electrical","name":"Electrical work","family":null,"kind":"hard","aliases":["electrical wiring","electrical systems","nec code","nec","national electrical code","electrical schematics","conduit","conduit bending","bending conduit","bend conduit","wire pulling","pulling wire","pull wire","switchgear","panelboards","panel installation","panel upgrades","service upgrades","circuit breakers","branch circuits","3-phase","three-phase","three phase","motor controls","lighting controls","low voltage wiring","electrical troubleshooting","electrical installation","electrical installations","electrical maintenance","commercial electrical","industrial electrical","residential electrical","rough-in and trim","rough-in","trim-out"]},{"id":"electrician_license","name":"Electrician license (journeyman)","family":null,"kind":"cert","license":true,"aliases":["journeyman electrician license","journeyman electrical license","journeyman license","journeyman electrician","journeyman card","electrician license","electrician's license","electrical license","licensed electrician","general journeyman electrician certificate","journeyman electrician certificate","01 certificate","01 electrical certificate"]},{"id":"master_electrician","name":"Master electrician license","family":null,"kind":"cert","license":true,"aliases":["master electrician license","master electrical license","master electrician","master electrician's license","electrical contractor license"],"implies":["electrician_license"]},{"id":"blueprint_reading","name":"Blueprint / drawing reading","family":null,"kind":"hard","aliases":["blueprint reading","reading blueprints","read blueprints","blueprints","technical drawings","engineering drawings","drawing interpretation","schematics","read schematics","reading schematics"]},{"id":"plc","name":"PLCs / industrial controls","family":null,"kind":"hard","aliases":["plc","plcs","plc programming","plc troubleshooting","ladder logic","allen-bradley","allen bradley","controllogix","compactlogix","studio 5000","rslogix","siemens s7","tia portal","hmi programming","programmable logic controllers"]},{"id":"industrial_maintenance","name":"Industrial & equipment maintenance","family":null,"kind":"hard","aliases":["industrial maintenance","plant maintenance","manufacturing maintenance","maintenance electrician","preventive maintenance","predictive maintenance","production line maintenance","equipment maintenance"]},{"id":"osha_card","name":"OSHA 10/30 safety training","family":null,"kind":"cert","aliases":["osha 10","osha 30","osha-10","osha-30","osha 10-hour","osha 30-hour","osha 10 hour","osha 30 hour","osha 500","osha 510","osha card","osha certification","osha certified","osha outreach training"]},{"id":"forklift","name":"Forklift / warehouse equipment","family":null,"kind":"hard","aliases":["forklift","pallet jack","reach truck"]},{"id":"coaching_sport","name":"Coaching","family":null,"kind":"hard","aliases":["coaching experience","athletic coaching","practice plans","player development","strength and conditioning"]},{"id":"cpa","name":"CPA","family":null,"kind":"cert","aliases":["cpa","certified public accountant","cpa license"],"license":true},{"id":"cfa","name":"CFA","family":null,"kind":"cert","aliases":["cfa","chartered financial analyst","cfa level i","cfa level 1"]},{"id":"pmp","name":"PMP","family":null,"kind":"cert","aliases":["pmp","project management professional"],"implies":["capm_cert"]},{"id":"aprn_license","name":"APRN license (NP / CNS / CRNA)","family":null,"kind":"cert","license":true,"aliases":["aprn","aprn license","aprn-cns","aprn cns","advanced practice registered nurse","nurse practitioner license","np license","certificate to prescribe","accns-ag","ccns","crna license","fnp-bc","agacnp-bc","aanp certification"],"implies":["rn_license"]},{"id":"rn_license","name":"RN license","family":null,"kind":"cert","aliases":["rn license","registered nurse license","active rn","rn licensure","nursing license","compact rn license","multistate rn license"],"license":true},{"id":"cna_cert","name":"CNA / MA certification","family":null,"kind":"cert","aliases":["certified nursing assistant","cna certification","cna certified","cna license","certified medical assistant","registered medical assistant","cma certification"],"cs":["CNA","RMA","CMA"],"ctx":["certified","certification","license","licensed","registry","state","active","current","medical assistant","nursing assistant"]},{"id":"bls_cpr","name":"BLS / CPR certification","family":null,"kind":"cert","aliases":["bls certification","bls certified","basic life support","cpr certification","cpr certified","cpr","first aid certification"],"cs":["BLS"],"ctx":["certification","certified","cpr","acls","pals","nurse","rn","patient","clinical","current","active"]},{"id":"acls","name":"ACLS certification","family":null,"kind":"cert","aliases":["acls","acls certification","acls certified","advanced cardiovascular life support","advanced cardiac life support"],"implies":["bls_cpr"]},{"id":"pals","name":"PALS certification","family":null,"kind":"cert","aliases":["pediatric advanced life support","pals certification","pals certified"],"cs":["PALS"],"ctx":["certification","certified","acls","bls","nurse","rn","pediatric","life support","current","active"],"implies":["bls_cpr"]},{"id":"aws_cert","name":"Cloud certification","family":null,"kind":"cert","aliases":["aws certified","aws certification","solutions architect associate","azure certification","google cloud certification"]},{"id":"security_cert","name":"Security certification","family":null,"kind":"cert","aliases":["security certification","security certifications","cybersecurity certification","cybersecurity certifications","information security certification","industry security certification"]},{"id":"dod_iat2","name":"DoD 8140/8570 baseline certification (IAT II)","family":null,"kind":"cert","aliases":["iat level ii","iat level 2","iat ii","iat-ii","iat 2","iat-2","dod 8570","dod 8140","dod 8570.01-m","dod 8140/8570","8570 compliant","8140 compliant","8570 certification","8140 certification","8570 baseline","8140 baseline"]},{"id":"security_plus","name":"CompTIA Security+","family":null,"kind":"cert","aliases":["security+","comptia security+","security+ ce","sec+","security plus","comptia security plus"],"implies":["security_cert","dod_iat2"]},{"id":"cysa","name":"CompTIA CySA+","family":null,"kind":"cert","aliases":["cysa+","comptia cysa+","cysa","cybersecurity analyst+"],"implies":["security_cert","dod_iat2"]},{"id":"casp","name":"CompTIA CASP+ / SecurityX","family":null,"kind":"cert","aliases":["casp+","comptia casp+","casp","securityx","comptia securityx"],"implies":["security_cert","dod_iat2"]},{"id":"cissp","name":"CISSP","family":null,"kind":"cert","aliases":["cissp","certified information systems security professional"],"implies":["security_cert","dod_iat2"]},{"id":"cism","name":"CISM","family":null,"kind":"cert","aliases":["cism","certified information security manager"],"implies":["security_cert"]},{"id":"ceh","name":"CEH","family":null,"kind":"cert","aliases":["ceh","certified ethical hacker"],"implies":["security_cert"]},{"id":"oscp","name":"OSCP","family":null,"kind":"cert","aliases":["oscp","oscp+","offensive security certified professional"],"implies":["security_cert"]},{"id":"gcih","name":"GCIH","family":null,"kind":"cert","aliases":["gcih","giac certified incident handler"],"implies":["security_cert","dod_iat2"]},{"id":"giac_cert","name":"GIAC certification","family":null,"kind":"cert","aliases":["gsec","gcia","gpen","gcfa","gcfe","gnfa","gwapt","giac certification","giac certified"],"implies":["security_cert"]},{"id":"comptia_a_plus","name":"CompTIA A+","family":null,"kind":"cert","aliases":["comptia a+","a+ certification","a+ certified","comptia a plus"]},{"id":"network_plus","name":"CompTIA Network+","family":null,"kind":"cert","aliases":["comptia network+","network+","network+ certification","network plus"]},{"id":"teaching_license","name":"Teaching license","family":null,"kind":"cert","aliases":["teaching license","teaching certificate","teaching certification","state certification","teaching credential","educator certificate","educator certification","educator license","professional educator certificate","professional educator license","teacher certification","teacher certificate","teacher license","teaching licence"],"license":true},{"id":"bar_admission","name":"Bar admission","family":null,"kind":"cert","aliases":["bar admission","admitted to the bar","admission to the bar","licensed attorney","member of the bar","licensed to practice law","admitted to practice law","bar membership","active bar membership","active bar license","bar license","state bar admission"],"license":true},{"id":"paralegal_cert","name":"Paralegal certificate","family":null,"kind":"cert","aliases":["paralegal certificate","paralegal certification"]},{"id":"cdl","name":"CDL","family":null,"kind":"cert","aliases":["cdl","commercial driver's license","commercial drivers license","class a cdl"],"license":true},{"id":"shrm","name":"SHRM / PHR","family":null,"kind":"cert","aliases":["shrm-cp","shrm cp","phr","sphr","shrm-scp"]},{"id":"spanish","name":"Spanish","family":null,"kind":"lang","aliases":["bilingual spanish","bilingual in spanish","spanish-speaking","spanish speaking","fluent in spanish","spanish fluency","bilingual (spanish","bilingual english/spanish","english/spanish"],"cs":["Spanish"],"ctx":["fluent","fluency","bilingual","speak","speaking","proficient","proficiency","native","language","languages","spoken","verbal","conversational"]},{"id":"french","name":"French","family":null,"kind":"lang","aliases":["bilingual french","bilingual in french","fluent in french","french fluency"],"cs":["French"],"ctx":["fluent","fluency","bilingual","speak","speaking","proficient","proficiency","native","language","languages","spoken","verbal","conversational"]},{"id":"mandarin","name":"Mandarin","family":null,"kind":"lang","aliases":["fluent in mandarin","mandarin chinese","mandarin-speaking","mandarin speaking","bilingual mandarin"],"cs":["Mandarin","Cantonese"],"ctx":["fluent","fluency","bilingual","speak","speaking","proficient","proficiency","native","language","languages","spoken","verbal","conversational","chinese"]},{"id":"german","name":"German","family":null,"kind":"lang","aliases":["fluent in german","german fluency","german-speaking","german speaking"],"cs":["German"],"ctx":["fluent","fluency","bilingual","speak","speaking","proficient","proficiency","native","language","languages","spoken","verbal","conversational"]},{"id":"portuguese","name":"Portuguese","family":null,"kind":"lang","aliases":["fluent in portuguese","portuguese fluency","portuguese-speaking","portuguese speaking"],"cs":["Portuguese"],"ctx":["fluent","fluency","bilingual","speak","speaking","proficient","proficiency","native","language","languages","spoken","verbal","conversational"]},{"id":"japanese","name":"Japanese","family":null,"kind":"lang","aliases":["fluent in japanese","japanese fluency","japanese-speaking","japanese speaking","jlpt"],"cs":["Japanese"],"ctx":["fluent","fluency","bilingual","speak","speaking","proficient","proficiency","native","language","languages","spoken","verbal","conversational"]},{"id":"asl","name":"ASL","family":null,"kind":"lang","aliases":["american sign language"],"cs":["ASL"],"ctx":["sign","language","deaf","interpreter","interpreting","fluent","bilingual"]},{"id":"jd_degree","name":"J.D. (law degree)","family":null,"kind":"cert","aliases":["j.d.","juris doctor","jd degree","j.d. degree","law degree","doctor of law"],"cs":["JD"],"ctx":["law","bar","attorney","legal","counsel","litigation","degree"]},{"id":"pe_license","name":"PE license","family":null,"kind":"cert","license":true,"aliases":["pe license","p.e. license","pe licensure","professional engineer license","professional engineering license","professional engineer (pe) license","professional engineer (pe)","licensed professional engineer","registered professional engineer","licensed pe","registered pe"],"implies":["eit_cert"]},{"id":"eit_cert","name":"EIT / FE exam","family":null,"kind":"cert","aliases":["eit","e.i.t.","engineer in training","engineer-in-training","eit certification","fe exam","fundamentals of engineering exam","fe certification"]},{"id":"pharmacist_license","name":"Pharmacist license","family":null,"kind":"cert","license":true,"aliases":["pharmacist license","pharmacy license","licensed pharmacist","registered pharmacist","rph","rph license","pharmacist licensure","licensure as a pharmacist","licensed as a pharmacist"]},{"id":"pharmd","name":"PharmD","family":null,"kind":"cert","aliases":["pharmd","pharm.d","pharm.d.","doctor of pharmacy"]},{"id":"pharmacy_residency","name":"Pharmacy residency (PGY1/PGY2)","family":null,"kind":"cert","aliases":["pgy1","pgy-1","pgy 1","pgy2","pgy-2","pgy 2","pharmacy residency","pgy1 residency","pgy2 residency","ashp-accredited residency","ashp accredited residency","pgy1 pharmacy residency","pgy2 pharmacy residency"]},{"id":"pharmacy_board_cert","name":"Pharmacy board certification (BCPS\u2026)","family":null,"kind":"cert","aliases":["bcps","bcacp","bcidp","bcccp","bcop","bcpp","bcgp","board certified pharmacotherapy specialist","board-certified pharmacotherapy specialist","board certified pharmacist","bps board certification"]},{"id":"pharmacokinetics","name":"Pharmacokinetics / TDM","family":null,"kind":"hard","aliases":["pharmacokinetics","pharmacokinetic dosing","pharmacokinetic monitoring","pk dosing","pk/pd","therapeutic drug monitoring","vancomycin dosing","aminoglycoside dosing"]},{"id":"anticoagulation","name":"Anticoagulation","family":null,"kind":"hard","aliases":["anticoagulation","anticoagulation management","anticoagulation clinic","warfarin management","heparin dosing","anticoagulant management"]},{"id":"antimicrobial_stewardship","name":"Antimicrobial stewardship","family":null,"kind":"hard","aliases":["antimicrobial stewardship","antibiotic stewardship","stewardship program","prospective audit and feedback"]},{"id":"sterile_compounding","name":"Sterile compounding / TPN","family":null,"kind":"hard","aliases":["sterile compounding","iv compounding","usp 797","usp <797>","usp 800","usp <800>","total parenteral nutrition","parenteral nutrition","tpn"]},{"id":"medication_therapy_mgmt","name":"Medication therapy management","family":null,"kind":"hard","aliases":["medication therapy management","mtm","medication reconciliation","med rec","comprehensive medication review","medication reviews"]},{"id":"order_verification","name":"Medication order verification","family":null,"kind":"hard","aliases":["order verification","medication order verification","verifying medication orders","verify medication orders","order entry and verification","verification of medication orders"]},{"id":"prior_auth","name":"Prior authorization","family":null,"kind":"hard","aliases":["prior authorization","prior authorizations","prior auth","prior auths","insurance authorizations"]},{"id":"cfd","name":"CFD","family":"simulation_tools","kind":"hard","aliases":["cfd","computational fluid dynamics","star-ccm+","star ccm+","starccm+","ansys fluent","openfoam","cfd analysis","cfd simulation"]},{"id":"fea","name":"FEA","family":"simulation_tools","kind":"hard","aliases":["fea","finite element analysis","finite element modeling","finite element modelling","ansys mechanical","abaqus","nastran","ls-dyna"]},{"id":"ansys","name":"ANSYS","family":"simulation_tools","kind":"tool","aliases":["ansys","ansys workbench"]},{"id":"heat_transfer","name":"Heat transfer / thermal analysis","family":null,"kind":"hard","aliases":["heat transfer","thermal analysis","thermal management","thermal modeling","thermal modelling","thermal simulation","thermodynamics","thermal design"]},{"id":"gdt","name":"GD&T","family":null,"kind":"hard","aliases":["gd&t","gd & t","geometric dimensioning and tolerancing","tolerance stack-up","tolerance stackup","tolerance stack-ups","tolerance analysis"]},{"id":"fmea","name":"FMEA / APQP","family":null,"kind":"hard","aliases":["dfmea","pfmea","fmea","failure mode and effects analysis","failure modes and effects analysis","dvp&r","apqp","ppap"]},{"id":"solidworks","name":"SolidWorks","family":"cad_tools","kind":"tool","aliases":["solidworks","solid works"],"implies":["cad"]},{"id":"catia","name":"CATIA","family":"cad_tools","kind":"tool","aliases":["catia","catia v5","catia v6"],"implies":["cad"]},{"id":"creo_nx","name":"Creo / NX","family":"cad_tools","kind":"tool","aliases":["creo","ptc creo","siemens nx","unigraphics","nx cad"],"implies":["cad"]},{"id":"fluid_power","name":"Pneumatics / hydraulics","family":null,"kind":"hard","aliases":["pneumatics","pneumatic systems","hydraulics","hydraulic systems","fluid power"]},{"id":"machine_design","name":"Machine design","family":null,"kind":"hard","aliases":["machine design","mechanism design","mechanical design","design of machine elements"]},{"id":"optimization","name":"Optimization modeling","family":"or_tools","kind":"hard","aliases":["linear programming","integer programming","mixed-integer programming","mixed integer programming","milp","mathematical optimization","optimization modeling","optimization modelling","mathematical programming","operations research","network optimization","constraint programming"]},{"id":"or_solvers","name":"Optimization solvers (Gurobi, CPLEX\u2026)","family":"or_tools","kind":"tool","aliases":["gurobi","cplex","or-tools","google or-tools","pyomo","pulp","ampl","gams"]},{"id":"simulation_modeling","name":"Simulation modeling","family":null,"kind":"hard","aliases":["discrete-event simulation","discrete event simulation","simulation modeling","simulation modelling","anylogic","simio","arena simulation"]},{"id":"survey_tools","name":"Survey tools (Qualtrics\u2026)","family":null,"kind":"tool","aliases":["qualtrics","surveymonkey","survey monkey","typeform"]},{"id":"design_systems","name":"Design systems","family":null,"kind":"hard","aliases":["design systems","design system","component library","component libraries","storybook"]},{"id":"ediscovery","name":"E-discovery (Relativity\u2026)","family":null,"kind":"tool","implies":["litigation"],"aliases":["electronic discovery","relativity","relativity administration","relativity processing","nuix","everlaw","brainspace","litigation support software"]},{"id":"injection_molding","name":"Plastics / injection molding","family":null,"kind":"hard","aliases":["injection molding","injection moulding","plastic part design","plastics design","plastic parts design","mold design","mould design","tooling design","design for manufacturing","design for manufacturability"]},{"id":"compensation_analysis","name":"Compensation analysis","family":null,"kind":"hard","aliases":["compensation analysis","market pricing","salary benchmarking","compensation benchmarking","comp benchmarking","pay equity","pay equity analysis","salary surveys","salary survey","compensation surveys","job pricing","salary structures","pay bands","total rewards"]},{"id":"b2b_sales","name":"B2B sales","family":"sales_motion","kind":"hard","aliases":["b2b sales","saas sales","enterprise sales","smb sales","mid-market sales","b2b saas sales","selling saas","selling software","software sales","b2b business development"]},{"id":"credit_analysis","name":"Credit analysis / underwriting","family":null,"kind":"hard","aliases":["credit analysis","credit underwriting","commercial credit","commercial lending","loan underwriting","credit memos","credit memo","credit memorandum","spreading financial statements","financial spreading","financial spreads","cash flow analysis","risk rating","risk ratings","debt service coverage","global cash flow"]},{"id":"capm_cert","name":"CAPM","family":null,"kind":"cert","aliases":["capm","certified associate in project management"]},{"id":"vendor_management","name":"Vendor management","family":null,"kind":"hard","aliases":["vendor management","vendor relationship management","vendor relationships","managing vendors","vendor oversight","vendor performance management","third-party vendor management"]},{"id":"test_automation","name":"Test automation","family":null,"kind":"hard","aliases":["test automation","automated testing","automation testing","automated tests","test automation framework","test automation frameworks","automation framework","automation frameworks","ui automation","api automation","automated test suites","automated ui tests"],"implies":["testing_qa"]},{"id":"selenium","name":"Selenium","family":"e2e_test_tools","kind":"tool","aliases":["selenium","selenium webdriver","webdriver"],"implies":["test_automation","testing_qa"]},{"id":"cypress","name":"Cypress","family":"e2e_test_tools","kind":"tool","aliases":["cypress.io"],"cs":["Cypress","cypress"],"ctx":["test","tests","testing","automation","automated","e2e","end-to-end","javascript","typescript","qa","selenium","playwright","framework","frameworks"],"implies":["test_automation","testing_qa"]},{"id":"playwright","name":"Playwright","family":"e2e_test_tools","kind":"tool","aliases":["playwright test"],"cs":["Playwright","playwright"],"ctx":["test","tests","testing","automation","automated","e2e","end-to-end","javascript","typescript","qa","selenium","cypress","browser","framework","frameworks"],"implies":["test_automation","testing_qa"]},{"id":"revenue_recognition","name":"Revenue recognition (ASC 606)","family":null,"kind":"hard","aliases":["revenue recognition","asc 606","asc606","ifrs 15","rev rec","revenue accounting"],"implies":["accounting"]},{"id":"lease_accounting","name":"Lease accounting (ASC 842)","family":null,"kind":"hard","aliases":["lease accounting","asc 842","asc842","ifrs 16","gasb 87"],"implies":["accounting"]},{"id":"gmp","name":"GMP / GxP","family":null,"kind":"hard","aliases":["gmp","cgmp","good manufacturing practice","good manufacturing practices","gmp compliance","gmp environment"]},{"id":"case_management","name":"Case management","family":null,"kind":"hard","aliases":["case management","discharge planning","care management","case coordination"]},{"id":"psychotherapy","name":"Psychotherapy","family":null,"kind":"hard","aliases":["psychotherapy","individual therapy","individual psychotherapy","group therapy","group psychotherapy","family therapy","couples therapy","outpatient therapy","individual and group therapy"]},{"id":"cbt","name":"CBT","family":null,"kind":"hard","aliases":["cognitive behavioral therapy","cognitive-behavioral therapy","cognitive behavioural therapy","trauma-focused cognitive behavioral therapy"],"cs":["CBT","TF-CBT"],"ctx":["therapy","therapist","therapists","therapeutic","clinical","clinician","counseling","counselor","mental health","behavioral health","anxiety","depression","trauma","clients","patients","treatment","emdr","dbt","psychotherapy","interventions","evidence-based"]},{"id":"dbt_therapy","name":"DBT (dialectical behavior therapy)","family":null,"kind":"hard","aliases":["dialectical behavior therapy","dialectical behavioral therapy","dialectical behaviour therapy"],"cs":["DBT"],"ctx":["therapy","therapist","therapists","therapeutic","clinical","clinician","counseling","cbt","emdr","mental health","behavioral health","clients","patients","trauma","treatment","dialectical","psychotherapy","skills group","skills groups","group therapy"]},{"id":"emdr","name":"EMDR","family":null,"kind":"hard","aliases":["emdr","eye movement desensitization and reprocessing"]},{"id":"lcsw","name":"LCSW (clinical social work license)","family":"clinical_license","kind":"cert","license":true,"aliases":["lcsw","licsw","lscsw","lisw-s","lisw","licensed clinical social worker","licensed independent clinical social worker","licensed specialist clinical social worker","licensed independent social worker"],"implies":["lmsw_license"]},{"id":"lpc_license","name":"LPC / LMHC (counselor license)","family":"clinical_license","kind":"cert","license":true,"aliases":["lpc","lpcc","lmhc","lcpc","lpc-s","licensed professional counselor","licensed mental health counselor","licensed clinical professional counselor","licensed professional clinical counselor"]},{"id":"lmft_license","name":"LMFT (marriage and family therapist license)","family":"clinical_license","kind":"cert","license":true,"aliases":["lmft","licensed marriage and family therapist","licensed marriage & family therapist"]},{"id":"lmsw_license","name":"LMSW (social work license)","family":"clinical_license","kind":"cert","license":true,"aliases":["lmsw","licensed master social worker","licensed masters social worker","licensed master's social worker","licensed social worker"]},{"id":"office_suite","name":"Office suite (Microsoft 365 / Google Workspace)","family":null,"kind":"soft","aliases":["microsoft office","ms office","office suite","microsoft office suite","ms office suite","microsoft 365","office 365","m365","google workspace","g suite","google suite"]},{"id":"communication","name":"Communication","family":null,"kind":"soft","aliases":["communication skills","written and verbal communication","verbal and written communication","excellent communication","strong communication","communicator","written communication","verbal communication"]},{"id":"leadership","name":"Leadership","family":null,"kind":"soft","aliases":["leadership skills","leadership experience","team leadership","led a team","people management","managing a team","mentorship","mentoring"]},{"id":"teamwork","name":"Teamwork","family":null,"kind":"soft","aliases":["teamwork","team player","collaborative","collaboration skills","works well with others"]},{"id":"problem_solving","name":"Problem solving","family":null,"kind":"soft","aliases":["problem solving","problem-solving","critical thinking","analytical thinking","analytical skills","analytical mindset"]},{"id":"detail","name":"Attention to detail","family":null,"kind":"soft","aliases":["attention to detail","detail-oriented","detail oriented","meticulous"]},{"id":"organization","name":"Organization","family":null,"kind":"soft","aliases":["organizational skills","time management","highly organized","multitasking","multi-tasking","prioritize multiple","juggle multiple"]},{"id":"adaptability","name":"Adaptability","family":null,"kind":"soft","aliases":["adaptability","fast-paced environment","fast paced environment","ambiguity","self-starter","self starter","growth mindset"]},{"id":"presenting","name":"Presenting","family":null,"kind":"soft","aliases":["presentation skills","public speaking","presenting to executives","storytelling with data"]},{"id":"customer_focus","name":"Customer focus","family":null,"kind":"soft","aliases":["customer-focused","customer focused","customer obsession","customer-centric","empathy","interpersonal skills"]}],"roles":[{"id":"software_engineer","name":"Software Engineer","parent":null,"group":"engineering","patterns":["software engineer","software engineering","software developer","software development engineer","swe","sde","application developer","applications developer","programmer","software engineering intern","developer","software development","staff software engineer","software architect","principal software engineer","application architect"]},{"id":"backend_engineer","name":"Backend Engineer","parent":"software_engineer","group":"engineering","patterns":["backend engineer","back-end engineer","back end engineer","backend developer","back-end developer","backend software engineer","api engineer","server engineer"]},{"id":"engineering_manager","name":"Engineering Manager","parent":null,"group":"engineering","patterns":["engineering manager","software engineering manager","manager of engineering","manager, software engineering","manager, engineering","head of engineering","director of engineering","vp of engineering","vp engineering"]},{"id":"frontend_engineer","name":"Frontend Engineer","parent":"software_engineer","group":"engineering","patterns":["frontend engineer","front-end engineer","front end engineer","frontend developer","front-end developer","ui engineer","web developer","javascript developer","react developer","frontend engineering","design systems engineer","ui developer","ux engineer","design technologist","ui/ux engineer"]},{"id":"fullstack_engineer","name":"Full-Stack Engineer","parent":"software_engineer","group":"engineering","patterns":["full stack","full-stack","fullstack","full stack engineer","full-stack engineer","full stack developer","full-stack developer"]},{"id":"mobile_engineer","name":"Mobile Engineer","parent":"software_engineer","group":"engineering","patterns":["mobile engineer","mobile developer","ios engineer","ios developer","android engineer","android developer","mobile software engineer"]},{"id":"embedded_engineer","name":"Embedded Engineer","parent":"software_engineer","group":"engineering","patterns":["embedded engineer","embedded software engineer","firmware engineer","embedded systems engineer"]},{"id":"devops_engineer","name":"DevOps / SRE","parent":null,"group":"engineering","patterns":["devops","devops engineer","site reliability","site reliability engineer","sre","platform engineer","cloud engineer","infrastructure engineer","release engineer","build engineer","platform reliability","production engineer, infrastructure","cloud architect","infrastructure architect","cloud solutions architect"]},{"id":"qa_engineer","name":"QA / Test Engineer","parent":null,"group":"engineering","patterns":["qa engineer","quality assurance engineer","test engineer","sdet","automation engineer","software quality engineer","qa automation engineer","software test engineer","software development engineer in test","software engineer in test","test automation engineer","automation tester","qa automation analyst","automation qa engineer"]},{"id":"security_engineer","name":"Security Engineer / Analyst","parent":null,"group":"security","patterns":["security engineer","security analyst","cybersecurity analyst","cyber security analyst","information security analyst","information security engineer","soc analyst","soc engineer","security operations analyst","security operations center","application security","cybersecurity engineer","cybersecurity specialist","cyber analyst","cyber defense analyst","incident responder","incident response analyst","incident response engineer","incident handler","threat hunter","threat hunting","threat analyst","threat intelligence analyst","cyber threat analyst","detection engineer","detection and response engineer","malware analyst","digital forensics analyst","forensic analyst","vulnerability analyst","security architect","cyber threat intelligence analyst","cyber intelligence analyst"]},{"id":"security_grc","name":"Security GRC / ISSO","parent":null,"group":"security","patterns":["information system security officer","information systems security officer","isso","issm","grc analyst","security compliance analyst","cybersecurity compliance analyst","it security compliance","rmf analyst","security control assessor","information assurance analyst","cyber risk analyst","it risk analyst","security risk analyst","information security officer","chief information security officer"]},{"id":"offensive_security","name":"Penetration Tester / Red Team","parent":null,"group":"security","patterns":["penetration tester","penetration testing","pen tester","pentester","red team","red teamer","red team operator","offensive security","ethical hacker","application penetration tester"]},{"id":"game_developer","name":"Game Developer","parent":"software_engineer","group":"engineering","patterns":["game developer","gameplay engineer","game programmer","game engineer"]},{"id":"hardware_engineer","name":"Hardware / Mechanical Engineer","parent":null,"group":"physical_engineering","patterns":["mechanical engineer","electrical engineer","hardware engineer","design engineer","aerospace engineer","thermal engineer","thermal systems engineer","thermal analyst","cfd engineer","cfd analyst","product design engineer","mechanical design engineer","hvac engineer","battery engineer","mechatronics engineer","electrical engineering","mechanical engineering","power systems engineer","substation engineer"]},{"id":"civil_engineer","name":"Civil / Structural Engineer","parent":null,"group":"physical_engineering","patterns":["civil engineer","structural engineer","geotechnical engineer","transportation engineer","water resources engineer","site engineer","civil designer","civil engineering","stormwater engineer","stormwater","drainage engineer","engineer in training","engineer-in-training","land development engineer","land development","site development engineer","site civil engineer","municipal engineer","water resources","wastewater engineer","water engineer","hydraulic engineer","highway engineer","traffic engineer","roadway engineer","bridge engineer","environmental engineer"]},{"id":"process_engineer","name":"Chemical / Process Engineer","parent":null,"group":"physical_engineering","patterns":["chemical engineer","process development engineer","chemical process engineer"]},{"id":"manufacturing_engineer","name":"Manufacturing / Process Engineer","parent":null,"group":"physical_engineering","patterns":["manufacturing engineer","manufacturing engineering","process engineer","industrial engineer","production engineer","continuous improvement engineer","continuous improvement","lean engineer","lean manufacturing engineer","quality engineer","manufacturing quality engineer","supplier quality engineer","supplier quality","automation engineer, manufacturing","tooling engineer","welding engineer","npi engineer","new product introduction engineer"]},{"id":"hardware_eng_manager","name":"Engineering Manager (hardware / mechanical)","parent":null,"group":"physical_engineering","patterns":["mechanical engineering manager","manufacturing engineering manager","hardware engineering manager","electrical engineering manager","thermal engineering manager","engineering manager, mechanical"]},{"id":"data_analyst","name":"Data Analyst","parent":null,"group":"data","patterns":["data analyst","analytics analyst","reporting analyst","insights analyst","data analytics","analytics associate","bi analyst","business intelligence analyst","business intelligence","data & analytics","data and analytics","analytics intern","data analyst intern","analytics specialist","data analysis","analytics"]},{"id":"product_analyst","name":"Product Analyst","parent":"data_analyst","group":"data","patterns":["product analyst","product analytics","product insights analyst","product data analyst","growth analyst","experimentation analyst"]},{"id":"marketing_analyst","name":"Marketing Analyst","parent":"data_analyst","group":"data","patterns":["marketing analyst","marketing analytics","marketing data analyst","digital analyst","web analyst"]},{"id":"business_analyst","name":"Business Analyst","parent":null,"group":"data","patterns":["business analyst","business systems analyst","systems analyst","business analysis","it business analyst"]},{"id":"data_scientist","name":"Data Scientist","parent":null,"group":"data","patterns":["data scientist","data science","applied scientist","research scientist","machine learning","decision scientist","quantitative researcher","data scientist intern","statistician","biostatistician"]},{"id":"ml_engineer","name":"ML / AI Engineer","parent":null,"group":"data","patterns":["machine learning engineer","ml engineer","ai engineer","mlops engineer","deep learning engineer","nlp engineer","computer vision engineer","applied ml","machine learning","artificial intelligence"]},{"id":"data_engineer","name":"Data Engineer","parent":null,"group":"data","patterns":["data engineer","big data engineer","etl developer","data platform engineer","data pipeline engineer","data engineering","database administrator","dba","database engineer","database developer","data architect"]},{"id":"analytics_engineer","name":"Analytics Engineer","parent":null,"group":"data","patterns":["analytics engineer","analytics engineering"]},{"id":"quant_analyst","name":"Quantitative Analyst","parent":null,"group":"finance","patterns":["quantitative analyst","quant analyst","quantitative developer","quant trader","quantitative trader","quant researcher"]},{"id":"product_manager","name":"Product Manager","parent":null,"group":"product","patterns":["product manager","associate product manager","apm","product owner","technical product manager","product management","product lead","group product manager","senior product manager","product management intern","pm intern","rotational product manager","data-focused pm","product manager intern"]},{"id":"product_operations","name":"Product Operations","parent":null,"group":"product","patterns":["product operations","product ops","product operations associate","product operations manager"]},{"id":"program_manager","name":"Program Manager","parent":null,"group":"product","patterns":["program manager","technical program manager","tpm","program coordinator","technical program coordinator","program associate","program lead"]},{"id":"project_manager","name":"Project Manager","parent":null,"group":"operations","patterns":["project manager","project coordinator","project associate","project management","implementation manager","delivery manager","pmo analyst"]},{"id":"product_designer","name":"Product / UX Designer","parent":null,"group":"design","patterns":["product designer","ux designer","ui designer","ux/ui designer","ui/ux designer","interaction designer","user experience designer","visual designer","web designer","ux design intern","product design intern","design intern","ux design","product design","ui design","user experience design","ux/ui design","ui/ux design","interaction design"]},{"id":"ux_researcher","name":"UX Researcher","parent":null,"group":"design","patterns":["ux researcher","user researcher","ux research","design researcher","user experience researcher","ux research intern","user research"]},{"id":"graphic_designer","name":"Graphic Designer","parent":null,"group":"design","patterns":["graphic designer","brand designer","marketing designer","creative designer","visual communications designer","motion designer","illustrator","art director","production artist","video editor"]},{"id":"marketing_generalist","name":"Marketing","parent":null,"group":"marketing","patterns":["marketing coordinator","marketing specialist","marketing manager","marketing associate","marketing intern","digital marketing","marketing assistant","marketing generalist","field marketing","event marketing","partner marketing","demand generation","marketing operations","marketing"]},{"id":"growth_marketer","name":"Growth / Performance Marketer","parent":"marketing_generalist","group":"marketing","patterns":["growth marketer","growth marketing","performance marketing","paid media","paid social","user acquisition","acquisition marketing","lifecycle marketing","crm marketing","email marketing","sem specialist","ppc specialist","head of growth","growth lead","growth manager"]},{"id":"content_marketer","name":"Content Marketer","parent":"marketing_generalist","group":"marketing","patterns":["content marketing","content marketer","content strategist","content manager","content specialist","seo specialist","seo manager","seo analyst","seo strategist"]},{"id":"social_media","name":"Social Media","parent":"marketing_generalist","group":"marketing","patterns":["social media","social media manager","social media coordinator","social media specialist","community manager","creator partnerships","influencer marketing"]},{"id":"product_marketing","name":"Product Marketing","parent":null,"group":"marketing","patterns":["product marketing","product marketing manager","product marketing associate","pmm"]},{"id":"brand_comms","name":"Communications / PR","parent":null,"group":"marketing","patterns":["communications","public relations","pr manager","pr coordinator","communications coordinator","communications specialist","comms","brand manager","brand marketing","media relations","public information officer","public affairs specialist","public affairs officer","communications officer","media relations specialist","media relations manager","internal communications","corporate communications"]},{"id":"sdr","name":"SDR / BDR","parent":null,"group":"sales","patterns":["sales development representative","sales development rep","sdr","business development representative","bdr","business development rep","sales development"]},{"id":"account_executive","name":"Account Executive","parent":null,"group":"sales","patterns":["account executive","ae","sales executive","sales representative","sales rep","inside sales","outside sales","sales associate","sales consultant","territory manager","sales manager","regional sales","sales"]},{"id":"account_manager","name":"Account Manager","parent":null,"group":"sales","patterns":["account manager","key account manager","client manager","relationship manager","client services","client success manager"]},{"id":"business_development","name":"Business Development","parent":null,"group":"sales","patterns":["business development","partnerships manager","partnerships associate","partnership manager","biz dev","strategic partnerships","channel manager"]},{"id":"sales_engineer","name":"Sales / Solutions Engineer","parent":null,"group":"sales","patterns":["sales engineer","solutions engineer","solutions consultant","pre-sales","presales","solutions architect","technical account manager"]},{"id":"customer_success","name":"Customer Success","parent":null,"group":"customer","patterns":["customer success","customer success manager","csm","customer success associate","customer success intern","onboarding specialist","implementation specialist","implementation consultant","customer onboarding","renewals manager"]},{"id":"customer_support","name":"Customer Support","parent":null,"group":"customer","patterns":["customer support","customer service","support specialist","support representative","customer care","technical support specialist","support engineer","customer experience","call center","client support"]},{"id":"financial_analyst","name":"Financial Analyst","parent":null,"group":"finance","patterns":["financial analyst","finance analyst","fp&a","fp&a analyst","financial planning","finance associate","corporate finance","finance intern","financial analyst intern","treasury analyst","pricing analyst","revenue analyst","finance","financial analysis"]},{"id":"accountant","name":"Accountant","parent":null,"group":"finance","patterns":["accountant","staff accountant","senior accountant","accounting","accounting associate","accounting intern","auditor","audit associate","tax associate","tax accountant","tax senior","tax preparer","tax specialist","controller","audit senior","audit senior associate","assurance associate","assurance senior","audit and assurance"]},{"id":"investment_analyst","name":"Investment / Banking Analyst","parent":null,"group":"finance","patterns":["investment analyst","investment banking","investment banking analyst","private equity","venture capital","equity research","associate, investments","investment associate","portfolio analyst","wealth management","financial advisor"]},{"id":"risk_compliance","name":"Risk & Compliance","parent":null,"group":"legal","patterns":["compliance analyst","compliance specialist","compliance officer","compliance associate","risk analyst","aml analyst","kyc analyst","regulatory analyst","risk associate","fraud analyst"]},{"id":"actuary","name":"Actuary","parent":null,"group":"finance","patterns":["actuary","actuarial analyst","actuarial associate"]},{"id":"recruiter","name":"Recruiter","parent":null,"group":"people","patterns":["recruiter","talent acquisition","sourcer","recruiting coordinator","technical recruiter","recruiting associate","talent partner","recruitment consultant","recruiting","physician recruiter","nurse recruiter","healthcare recruiter"]},{"id":"hr_generalist","name":"HR / People Ops","parent":null,"group":"people","patterns":["hr generalist","human resources","hr coordinator","hr assistant","hr specialist","people operations","people ops","hr intern","benefits specialist","hr associate","people operations associate","hr","benefits & leave","benefits and leave","leave specialist","leave of absence specialist","benefits analyst","benefits administrator"]},{"id":"hr_business_partner","name":"HR Business Partner","parent":null,"group":"people","patterns":["hr business partner","hrbp","people partner","people business partner","senior hr business partner","associate hr business partner","hr business partner ii","talent business partner","employee relations partner","employee relations manager"]},{"id":"people_analytics","name":"People Analytics / Compensation","parent":null,"group":"people","patterns":["people analytics","people analyst","hr analyst","hr data analyst","workforce analyst","workforce planning analyst","compensation analyst","compensation specialist","total rewards analyst","hris analyst","people data analyst"]},{"id":"learning_development","name":"Learning & Development","parent":null,"group":"people","patterns":["learning and development","training specialist","training coordinator","l&d","corporate trainer","enablement"]},{"id":"operations","name":"Operations","parent":null,"group":"operations","patterns":["operations analyst","operations associate","operations coordinator","operations manager","operations specialist","business operations","bizops","strategy and operations","strategy & operations","operations intern","general manager","office operations","operations"]},{"id":"supply_planning","name":"Demand / Supply Planning (S&OP)","parent":null,"group":"operations","patterns":["demand planner","demand planning","demand planning analyst","supply planner","supply planning","supply planning analyst","supply chain planner","s&op","s&op analyst","s&op manager","sales and operations planning","forecast analyst","forecasting analyst","demand forecasting","inventory planning analyst","inventory optimization analyst","inventory analyst","replenishment analyst","replenishment planner","material planner","materials planner","master scheduler","production planner","planning associate"]},{"id":"supply_chain","name":"Supply Chain / Logistics","parent":null,"group":"operations","patterns":["supply chain","supply chain analyst","logistics","logistics coordinator","logistics analyst","procurement","buyer","purchasing","inventory manager","sourcing specialist","transportation analyst","logistics manager"]},{"id":"consultant","name":"Consultant / Strategy","parent":null,"group":"consulting","patterns":["consultant","consulting","strategy analyst","business consultant","management consultant","associate consultant","strategy associate","strategy intern","corporate strategy","advisory"]},{"id":"admin_assistant","name":"Administrative","parent":null,"group":"admin","patterns":["administrative assistant","executive assistant","office manager","receptionist","office coordinator","administrative coordinator","admin assistant","office assistant","front desk","clerk","executive business partner","executive coordinator","administrative business partner","executive administrator","executive office coordinator","personal assistant"]},{"id":"it_support","name":"IT Support / Admin","parent":null,"group":"it","patterns":["it support","help desk","helpdesk","desktop support","it specialist","it technician","systems administrator","system administrator","sysadmin","network administrator","network engineer","it analyst","it coordinator","network architect"]},{"id":"nurse","name":"Nurse","parent":null,"group":"healthcare","patterns":["registered nurse","rn","nurse","staff nurse","travel nurse","lpn","licensed practical nurse","nurse practitioner","charge nurse","nursing","clinical nurse specialist","nurse case manager","rn case manager"]},{"id":"clinical_educator","name":"Clinical / Nurse Educator","parent":null,"group":"healthcare","patterns":["clinical nurse educator","nurse educator","clinical educator","nursing educator","clinical education specialist","nursing professional development","nursing professional development specialist","nursing professional development practitioner","npd practitioner","npd specialist","staff development nurse","nursing education specialist","education nurse specialist","nurse residency coordinator","unit educator","unit-based educator","staff development educator","nurse residency program coordinator","clinical education coordinator"]},{"id":"medical_assistant","name":"Medical Assistant / Tech","parent":null,"group":"healthcare","patterns":["medical assistant","patient care technician","pct","phlebotomist","emt","cna","certified nursing assistant","medical technician","lab technician","pharmacy technician","surgical technician"]},{"id":"patient_coordinator","name":"Patient / Care Coordinator","parent":null,"group":"healthcare","patterns":["patient care coordinator","patient coordinator","care coordinator","patient services","patient access","patient navigator","intake coordinator","scheduling coordinator","medical receptionist","unit secretary"]},{"id":"clinical_research","name":"Clinical Research","parent":null,"group":"healthcare","patterns":["clinical research coordinator","clinical research","clinical research associate","cra","clinical trial","research coordinator","clinical data","study coordinator","regulatory coordinator"]},{"id":"healthcare_admin","name":"Healthcare Administration","parent":null,"group":"healthcare","patterns":["healthcare administration","healthcare administrator","health administration","practice manager","medical office manager","health services","revenue cycle","medical billing","medical coder","health information"]},{"id":"therapist","name":"Therapist / Clinician","parent":null,"group":"healthcare","patterns":["therapist","counselor","mental health","behavior technician","rbt","psychologist","psychotherapist","outpatient therapist","mental health therapist","behavioral health therapist","clinical therapist","licensed therapist","clinical social worker","licensed clinical social worker","mental health counselor","licensed professional counselor","marriage and family therapist","family therapist","mental health clinician","behavioral health clinician","outpatient clinician","clinical counselor"]},{"id":"medical_affairs","name":"Medical Affairs / Medical Information","parent":null,"group":"healthcare","patterns":["medical information","medical information specialist","medical information scientist","medical information associate","medical science liaison","msl","medical affairs","medical affairs specialist","pharmacovigilance","pharmacovigilance specialist","drug safety","drug safety specialist","drug safety associate","medical communications","medical writer","medical reviewer"]},{"id":"pharmacist","name":"Pharmacist","parent":null,"group":"healthcare","patterns":["pharmacist","staff pharmacist","clinical pharmacist","pharmacy manager","director of pharmacy","pharmacy director","pharmacy supervisor","clinical pharmacy manager"]},{"id":"paralegal","name":"Paralegal / Legal Assistant","parent":null,"group":"legal","patterns":["paralegal","legal assistant","legal intern","law clerk","litigation assistant","legal operations","contracts administrator","legal coordinator","docket","litigation support specialist","litigation support","e-discovery specialist","ediscovery specialist"]},{"id":"legal_secretary","name":"Legal Secretary / Legal Admin","parent":null,"group":"legal","patterns":["legal secretary","legal administrative assistant","legal admin","legal administrator","docketing clerk","legal receptionist"]},{"id":"attorney","name":"Attorney","parent":null,"group":"legal","patterns":["attorney","lawyer","counsel","associate attorney","legal counsel","corporate counsel","general counsel"]},{"id":"teacher","name":"Teacher","parent":null,"group":"education","patterns":["teacher","teaching","educator","instructor","lecturer","professor","teaching fellow","substitute teacher","special education","classroom aide","paraprofessional"]},{"id":"tutor","name":"Tutor / Academic Coach","parent":null,"group":"education","patterns":["tutor","tutoring","academic coach","learning specialist","test prep instructor","teaching assistant","writing center"]},{"id":"instructional_designer","name":"Instructional Designer","parent":null,"group":"education","patterns":["instructional designer","curriculum developer","curriculum designer","learning designer","learning experience designer","e-learning developer","elearning developer","e-learning designer","elearning designer","training developer","instructional technologist","curriculum specialist","instructional design","learning design","curriculum design"]},{"id":"education_admin","name":"Education / Student Services","parent":null,"group":"education","patterns":["admissions counselor","academic advisor","student services","career counselor","college advisor","program coordinator, education","enrollment counselor","residence director"]},{"id":"technical_writer","name":"Technical Writer","parent":null,"group":"content","patterns":["technical writer","documentation writer","documentation specialist","api writer","docs engineer","technical editor","knowledge base","technical writing"]},{"id":"copywriter","name":"Copywriter","parent":null,"group":"content","patterns":["copywriter","copy writer","content writer","writer","editor","copy editor","editorial assistant","journalist","reporter","proofreader","content creator","staff writer","associate editor","blog writer","ghostwriter"]},{"id":"research_assistant","name":"Research Assistant","parent":null,"group":"research","patterns":["research assistant","research associate","research analyst","research intern","research fellow","lab assistant","research technician","policy analyst","policy associate","policy fellow","economist","economic analyst","research coordinator, policy"]},{"id":"scientist","name":"Scientist / Lab","parent":null,"group":"research","patterns":["scientist","research scientist","chemist","biologist","microbiologist","laboratory scientist","associate scientist","lab scientist","bioinformatician","computational biologist"]},{"id":"electrician","name":"Electrician","parent":null,"group":"trades","patterns":["electrician","journeyman electrician","master electrician","electrician apprentice","apprentice electrician","electrical apprentice","electrician helper","electrical helper","electrical technician","inside wireman","wireman","lineman","lineworker","electrical foreman"]},{"id":"skilled_trades","name":"Skilled Trades / Technician","parent":null,"group":"trades","patterns":["hvac technician","maintenance technician","service technician","installer","mechanic","plumber","welder","machinist","carpenter","cnc machinist","cnc programmer","cnc operator","machine operator","diesel mechanic","automotive technician","auto technician","maintenance mechanic","field service technician","electronics technician","building maintenance technician","facilities technician"]},{"id":"driver_warehouse","name":"Driver / Warehouse / Inventory","parent":null,"group":"trades","patterns":["driver","delivery driver","truck driver","warehouse associate","warehouse worker","material handler","forklift operator","picker","packer","loader","warehouse","fulfillment","inventory control","inventory control specialist","inventory specialist","inventory clerk","stock clerk","receiving clerk","shipping clerk"]},{"id":"retail_hospitality","name":"Retail / Hospitality","parent":null,"group":"service","patterns":["retail associate","store associate","cashier","barista","server","host","hostess","bartender","line cook","cook","store manager","assistant store manager","district manager","area manager","shift supervisor","front of house","guest services","concierge","hotel","night auditor","night audit","front desk agent","front office agent","guest service agent","hotel front desk","chef","sous chef","executive chef","pastry chef","kitchen manager","restaurant manager","hotel manager","front office manager"]},{"id":"coach","name":"Coach / Athletics","parent":null,"group":"athletics","patterns":["coach","assistant coach","head coach","athletic trainer","strength and conditioning","strength & conditioning","sports program","athletic department","recreation coordinator","athletic director","sports coordinator","sports management"]},{"id":"fellowship","name":"Fellowship / Program","parent":null,"group":"programs","patterns":["fellowship","fellows program","scholarship","summer institute","research grant","grant program","residency program","leadership program"]},{"id":"qa_tester","name":"QA Tester / Analyst","parent":null,"group":"quality","patterns":["qa tester","qa analyst","software tester","game tester","manual tester","manual qa","quality assurance analyst","quality assurance tester","test analyst","software quality assurance analyst","qa test analyst","uat tester"]},{"id":"accounting_clerk","name":"Accounting Clerk / AP-AR","parent":null,"group":"finance","patterns":["accounts payable","accounts receivable","accounts payable specialist","accounts receivable specialist","ap specialist","ar specialist","ap clerk","ar clerk","ap/ar specialist","ap/ar clerk","accounting clerk","accounting assistant","billing specialist","billing clerk","billing coordinator","payroll specialist","payroll clerk","payroll coordinator","payroll administrator","bookkeeper","full charge bookkeeper","collections specialist","cash applications specialist","cash application specialist"]},{"id":"social_worker","name":"Social Worker / Case Manager","parent":null,"group":"healthcare","patterns":["social worker","medical social worker","hospital social worker","school social worker","case manager","care manager","discharge planner","community support specialist","peer support specialist","family support specialist","social services","social work"]},{"id":"personal_care","name":"Personal Care / Spa","parent":null,"group":"service","patterns":["massage therapist","licensed massage therapist","esthetician","aesthetician","cosmetologist","hair stylist","hairstylist","nail technician","nail tech","barber","spa therapist","makeup artist"]},{"id":"agile_coach","name":"Scrum Master / Agile Coach","parent":null,"group":"operations","patterns":["scrum master","agile coach","enterprise agile coach","release train engineer","agile team facilitator"]},{"id":"physician_ap","name":"Physician / PA","parent":null,"group":"healthcare","patterns":["physician","physician assistant","pa-c","hospitalist","attending physician","family medicine physician","internal medicine physician","pediatrician","psychiatrist","surgeon","anesthesiologist","emergency medicine physician","urgent care physician","medical director"]},{"id":"dental","name":"Dental","parent":null,"group":"healthcare","patterns":["dental hygienist","registered dental hygienist","dental assistant","expanded function dental assistant","dentist","general dentist","orthodontic assistant","dental office manager","dental front office"]},{"id":"veterinary","name":"Veterinary","parent":null,"group":"healthcare","patterns":["veterinarian","associate veterinarian","veterinary technician","vet tech","licensed veterinary technician","veterinary assistant","kennel assistant"]},{"id":"imaging_tech","name":"Imaging / Radiology Tech","parent":null,"group":"healthcare","patterns":["radiologic technologist","radiology technologist","rad tech","x-ray technician","x-ray technologist","ct technologist","mri technologist","sonographer","diagnostic medical sonographer","ultrasound technician","ultrasound technologist","mammography technologist","nuclear medicine technologist","cardiac sonographer"]},{"id":"public_health","name":"Public Health","parent":null,"group":"healthcare","patterns":["epidemiologist","public health analyst","public health specialist","health educator","community health worker","public health nurse","disease intervention specialist","health program coordinator"]},{"id":"construction_mgmt","name":"Construction Management","parent":null,"group":"trades","patterns":["construction manager","construction project manager","site superintendent","construction superintendent","estimator","cost estimator","construction estimator","construction coordinator","general contractor"]},{"id":"architecture","name":"Architecture / Interior Design","parent":null,"group":"design","patterns":["architectural designer","project architect","licensed architect","architectural intern","architectural drafter","interior designer","landscape architect","landscape designer"]},{"id":"real_estate","name":"Real Estate / Property","parent":null,"group":"real_estate","patterns":["real estate agent","realtor","real estate broker","leasing agent","leasing consultant","leasing specialist","property manager","assistant property manager","community association manager","transaction coordinator","escrow officer","title officer"]},{"id":"insurance","name":"Insurance (claims / underwriting)","parent":null,"group":"finance","patterns":["claims adjuster","claims examiner","claims specialist","claims representative","claims processor","insurance adjuster","insurance agent","insurance sales agent","insurance producer","underwriter","underwriting assistant","commercial lines underwriter","personal lines underwriter","policy services representative"]},{"id":"protective_services","name":"Security / Public Safety","parent":null,"group":"public_safety","patterns":["security officer","security guard","armed security officer","unarmed security officer","loss prevention","loss prevention specialist","police officer","patrol officer","sheriff deputy","deputy sheriff","correctional officer","detention officer","firefighter","fire fighter","911 dispatcher","emergency dispatcher","police dispatcher"]},{"id":"event_planner","name":"Events","parent":null,"group":"operations","patterns":["event planner","event coordinator","event manager","events coordinator","events manager","meeting planner","conference coordinator","conference planner","wedding planner","catering coordinator"]},{"id":"fundraising","name":"Fundraising / Development","parent":null,"group":"nonprofit","patterns":["development officer","major gifts officer","director of development","development director","development coordinator","development associate","fundraiser","fundraising coordinator","fundraising manager","grant writer","grants manager","grants coordinator","donor relations","annual giving","advancement officer","prospect researcher"]},{"id":"librarian","name":"Library / Archives","parent":null,"group":"education","patterns":["librarian","library assistant","library technician","library associate","archivist","school media specialist","teacher librarian","library manager"]},{"id":"environmental_sci","name":"Environmental / Earth Science","parent":null,"group":"research","patterns":["environmental scientist","environmental specialist","environmental consultant","environmental technician","environmental compliance specialist","geologist","hydrogeologist","hydrologist","ecologist","wildlife biologist","field biologist","natural resources specialist","conservation scientist","soil scientist","water quality specialist","water quality technician","water quality scientist","environmental field technician","geologist in training","geologist-in-training"]},{"id":"ehs","name":"Safety / EHS","parent":null,"group":"operations","patterns":["ehs specialist","ehs manager","ehs coordinator","safety specialist","safety coordinator","safety manager","safety officer","environmental health and safety","health and safety specialist","occupational safety","safety engineer"]},{"id":"quality_control","name":"Quality Control / Inspection","parent":null,"group":"physical_engineering","patterns":["quality control analyst","qc analyst","qc chemist","qc microbiologist","quality inspector","quality technician","quality control inspector","quality control technician","quality assurance specialist","qa specialist","validation specialist","document control specialist"]},{"id":"respiratory_therapy","name":"Respiratory Therapist","parent":null,"group":"healthcare","patterns":["respiratory therapist","registered respiratory therapist","respiratory care practitioner","respiratory therapy","respiratory care","certified respiratory therapist","respiratory therapist ii","lead respiratory therapist"]},{"id":"physical_therapy","name":"Physical Therapy","parent":null,"group":"healthcare","patterns":["physical therapist","physical therapist assistant","physical therapy","physical therapy assistant","doctor of physical therapy"]},{"id":"occupational_therapy","name":"Occupational Therapy","parent":null,"group":"healthcare","patterns":["occupational therapist","occupational therapy","occupational therapy assistant","certified occupational therapy assistant"]},{"id":"speech_pathology","name":"Speech-Language Pathology","parent":null,"group":"healthcare","patterns":["speech-language pathologist","speech language pathologist","speech therapist","speech pathologist","audiologist"]},{"id":"nutrition","name":"Dietitian / Nutrition","parent":null,"group":"healthcare","patterns":["dietitian","registered dietitian","dietician","nutritionist","clinical dietitian","diet technician"]},{"id":"aviation_maint","name":"Aircraft Maintenance","parent":null,"group":"trades","patterns":["aircraft mechanic","aircraft maintenance technician","aviation maintenance technician","a&p mechanic","airframe and powerplant","airframe mechanic","powerplant mechanic","helicopter mechanic","rotorcraft mechanic","avionics technician","aircraft technician","line maintenance technician","aircraft inspector","aircraft maintenance","aviation mechanic","aircraft structures technician"]},{"id":"flight_crew","name":"Pilot / Flight Crew","parent":null,"group":"trades","patterns":["pilot","first officer","flight attendant","flight instructor","airline pilot","commercial pilot","corporate pilot","helicopter pilot"]},{"id":"aviation_ops","name":"Aviation Operations","parent":null,"group":"trades","patterns":["aircraft dispatcher","flight dispatcher","line service technician","aircraft fueler","ramp agent","ramp service agent","ground crew","airport operations"]},{"id":"retail_banking","name":"Retail Banking","parent":null,"group":"finance","patterns":["bank teller","teller","personal banker","universal banker","relationship banker","branch banker","banking associate"]},{"id":"lending","name":"Lending / Mortgage","parent":null,"group":"finance","patterns":["loan officer","mortgage loan officer","loan originator","loan processor","mortgage processor","mortgage underwriter","loan underwriter","mortgage closer","loan closer","loan servicing specialist"]},{"id":"commercial_credit","name":"Commercial Credit","parent":null,"group":"finance","patterns":["credit analyst","commercial credit analyst","credit risk analyst","credit underwriter","commercial credit underwriter","commercial loan underwriter","credit officer","commercial credit officer","credit administration"]},{"id":"facilities_services","name":"Facilities / Environmental Services","parent":null,"group":"service","patterns":["custodian","janitor","housekeeper","housekeeping","housekeeping aide","environmental services technician","environmental services aide","environmental services worker","environmental services associate","evs technician","evs aide","groundskeeper"]},{"id":"urban_planner","name":"Urban / Regional Planner","parent":null,"group":"public_sector","patterns":["urban planner","city planner","regional planner","land use planner","transportation planner","long range planner","long-range planner","current planner","associate planner","assistant planner","planning technician","zoning administrator","zoning technician","community development planner","housing policy planner","principal planner"]},{"id":"gis_analyst","name":"GIS / Geospatial","parent":null,"group":"data","patterns":["gis analyst","gis specialist","gis technician","gis coordinator","gis developer","gis manager","geospatial analyst","geospatial intelligence analyst","geoint analyst","imagery analyst","remote sensing analyst","remote sensing specialist","cartographer","cartographic technician","geospatial engineer"]},{"id":"intel_analyst","name":"Intelligence Analyst","parent":null,"group":"security","patterns":["intelligence analyst","all-source intelligence analyst","all-source analyst","all source analyst","targeting analyst","geospatial targeting analyst","intelligence specialist"]}],"role_adj":[["engineering_manager","software_engineer",0.6],["engineering_manager","backend_engineer",0.55],["engineering_manager","program_manager",0.4],["data_analyst","business_analyst",0.8],["data_analyst","product_manager",0.35],["data_analyst","data_scientist",0.6],["data_analyst","analytics_engineer",0.6],["data_analyst","financial_analyst",0.45],["data_analyst","operations",0.5],["product_analyst","product_manager",0.55],["marketing_analyst","growth_marketer",0.55],["business_analyst","consultant",0.6],["business_analyst","product_manager",0.5],["business_analyst","project_manager",0.5],["business_analyst","operations",0.55],["business_analyst","financial_analyst",0.5],["data_scientist","ml_engineer",0.7],["data_scientist","quant_analyst",0.55],["data_scientist","research_assistant",0.4],["data_engineer","analytics_engineer",0.75],["data_engineer","backend_engineer",0.6],["data_engineer","ml_engineer",0.5],["ml_engineer","software_engineer",0.6],["devops_engineer","backend_engineer",0.55],["devops_engineer","software_engineer",0.6],["devops_engineer","it_support",0.4],["devops_engineer","security_engineer",0.45],["qa_engineer","software_engineer",0.55],["security_engineer","it_support",0.45],["software_engineer","sales_engineer",0.4],["product_manager","product_operations",0.7],["product_manager","program_manager",0.6],["product_manager","product_marketing",0.5],["product_manager","product_designer",0.35],["product_manager","project_manager",0.5],["product_operations","operations",0.6],["program_manager","project_manager",0.8],["project_manager","operations",0.55],["product_designer","ux_researcher",0.65],["product_designer","graphic_designer",0.5],["product_designer","frontend_engineer",0.35],["ux_researcher","research_assistant",0.45],["ux_researcher","product_analyst",0.35],["marketing_generalist","product_marketing",0.6],["marketing_generalist","brand_comms",0.6],["content_marketer","copywriter",0.7],["social_media","brand_comms",0.55],["social_media","copywriter",0.45],["product_marketing","content_marketer",0.5],["sdr","account_executive",0.6],["sdr","business_development",0.6],["account_executive","account_manager",0.65],["account_executive","business_development",0.6],["account_manager","customer_success",0.7],["customer_success","customer_support",0.6],["customer_success","project_manager",0.4],["sales_engineer","customer_success",0.45],["customer_support","it_support",0.4],["financial_analyst","accountant",0.5],["financial_analyst","investment_analyst",0.65],["financial_analyst","consultant",0.5],["investment_analyst","quant_analyst",0.45],["accountant","risk_compliance",0.4],["risk_compliance","paralegal",0.45],["risk_compliance","attorney",0.35],["paralegal","attorney",0.4],["recruiter","hr_generalist",0.6],["hr_generalist","learning_development",0.55],["operations","supply_chain",0.6],["operations","consultant",0.5],["operations","admin_assistant",0.4],["technical_writer","copywriter",0.5],["teacher","tutor",0.7],["teacher","instructional_designer",0.5],["tutor","education_admin",0.45],["instructional_designer","learning_development",0.6],["nurse","medical_assistant",0.45],["medical_assistant","patient_coordinator",0.6],["patient_coordinator","healthcare_admin",0.65],["clinical_research","research_assistant",0.6],["clinical_research","patient_coordinator",0.45],["research_assistant","scientist",0.55],["coach","teacher",0.4],["it_support","admin_assistant",0.3],["hardware_eng_manager","hardware_engineer",0.6],["hardware_eng_manager","engineering_manager",0.35],["civil_engineer","hardware_engineer",0.45],["process_engineer","hardware_engineer",0.5],["people_analytics","hr_generalist",0.6],["people_analytics","data_analyst",0.6],["security_engineer","offensive_security",0.6],["security_engineer","software_engineer",0.35],["offensive_security","software_engineer",0.3],["data_engineer","software_engineer",0.5],["electrician","skilled_trades",0.35],["clinical_educator","nurse",0.5],["clinical_educator","learning_development",0.4],["clinical_educator","instructional_designer",0.25],["clinical_educator","teacher",0.3],["legal_secretary","paralegal",0.35],["legal_secretary","admin_assistant",0.6],["supply_planning","supply_chain",0.6],["hr_business_partner","hr_generalist",0.5],["hr_business_partner","learning_development",0.4],["hr_business_partner","recruiter",0.35],["supply_planning","data_analyst",0.45],["supply_planning","operations",0.5],["supply_planning","financial_analyst",0.35],["supply_chain","driver_warehouse",0.35],["manufacturing_engineer","hardware_engineer",0.55],["manufacturing_engineer","process_engineer",0.6],["manufacturing_engineer","operations",0.35],["manufacturing_engineer","hardware_eng_manager",0.5],["manufacturing_engineer","skilled_trades",0.3],["medical_affairs","pharmacist",0.5],["medical_affairs","clinical_research",0.5],["medical_affairs","scientist",0.35],["medical_affairs","technical_writer",0.3],["security_grc","security_engineer",0.45],["security_grc","risk_compliance",0.6],["qa_tester","qa_engineer",0.5],["qa_tester","software_engineer",0.25],["qa_tester","business_analyst",0.3],["qa_tester","customer_support",0.3],["accounting_clerk","accountant",0.5],["accounting_clerk","admin_assistant",0.35],["social_worker","therapist",0.6],["social_worker","patient_coordinator",0.5],["personal_care","retail_hospitality",0.3],["agile_coach","project_manager",0.5],["agile_coach","program_manager",0.45],["agile_coach","product_manager",0.3],["physician_ap","nurse",0.5],["physician_ap","pharmacist",0.3],["dental","medical_assistant",0.4],["veterinary","medical_assistant",0.3],["imaging_tech","medical_assistant",0.4],["public_health","research_assistant",0.45],["public_health","clinical_research",0.45],["public_health","nurse",0.35],["public_health","social_worker",0.4],["construction_mgmt","project_manager",0.5],["construction_mgmt","civil_engineer",0.45],["construction_mgmt","skilled_trades",0.4],["architecture","civil_engineer",0.35],["architecture","graphic_designer",0.3],["real_estate","account_executive",0.4],["real_estate","customer_success",0.3],["insurance","risk_compliance",0.45],["insurance","financial_analyst",0.35],["insurance","customer_support",0.35],["protective_services","driver_warehouse",0.25],["event_planner","marketing_generalist",0.45],["event_planner","admin_assistant",0.45],["event_planner","project_manager",0.4],["fundraising","business_development",0.4],["fundraising","copywriter",0.4],["fundraising","marketing_generalist",0.35],["librarian","teacher",0.4],["librarian","research_assistant",0.4],["environmental_sci","scientist",0.55],["environmental_sci","civil_engineer",0.4],["environmental_sci","research_assistant",0.45],["ehs","operations",0.4],["ehs","manufacturing_engineer",0.4],["ehs","risk_compliance",0.4],["quality_control","manufacturing_engineer",0.5],["quality_control","scientist",0.45],["quality_control","qa_tester",0.25],["respiratory_therapy","nurse",0.35],["respiratory_therapy","physical_therapy",0.25],["respiratory_therapy","imaging_tech",0.25],["physical_therapy","occupational_therapy",0.5],["physical_therapy","therapist",0.3],["occupational_therapy","speech_pathology",0.4],["occupational_therapy","therapist",0.3],["speech_pathology","teacher",0.3],["nutrition","nurse",0.3],["nutrition","public_health",0.4],["aviation_maint","skilled_trades",0.4],["aviation_maint","aviation_ops",0.35],["aviation_maint","flight_crew",0.25],["aviation_ops","flight_crew",0.3],["aviation_ops","driver_warehouse",0.3],["retail_banking","customer_support",0.4],["retail_banking","lending",0.45],["retail_banking","retail_hospitality",0.3],["lending","commercial_credit",0.5],["lending","insurance",0.35],["commercial_credit","financial_analyst",0.5],["commercial_credit","investment_analyst",0.45],["commercial_credit","risk_compliance",0.4],["commercial_credit","accountant",0.35],["facilities_services","retail_hospitality",0.4],["facilities_services","skilled_trades",0.3],["urban_planner","gis_analyst",0.5],["urban_planner","environmental_sci",0.4],["urban_planner","civil_engineer",0.35],["urban_planner","research_assistant",0.35],["urban_planner","project_manager",0.3],["gis_analyst","data_analyst",0.45],["gis_analyst","environmental_sci",0.4],["gis_analyst","intel_analyst",0.55],["intel_analyst","security_engineer",0.35],["intel_analyst","research_assistant",0.35]],"industries":[{"id":"fintech","name":"Fintech & finance","keywords":["fintech","payments","banking","lending","credit card","brokerage","trading platform","financial services","insurance","insurtech","wealth management","asset management","investment firm","bank","capital markets","neobank","mortgage"]},{"id":"healthcare","name":"Healthcare & health tech","keywords":["healthcare","health care","health tech","healthtech","hospital","clinic","clinical","patients","patient","medical","telehealth","health system","pharmacy","digital health","care delivery"]},{"id":"biotech","name":"Biotech & pharma","keywords":["biotech","biotechnology","pharmaceutical","pharma","drug discovery","life sciences","genomics","therapeutics","biologics"]},{"id":"edtech","name":"Education & edtech","keywords":["edtech","education company","education technology","learning platform","school district","k-12","higher education","online learning","tutoring platform","learners"]},{"id":"ecommerce","name":"E-commerce & retail","keywords":["e-commerce","ecommerce","retail","online store","marketplace","consumer goods","cpg","direct-to-consumer","dtc","shoppers","merchants","apparel"]},{"id":"saas","name":"B2B software / SaaS","keywords":["saas","b2b software","enterprise software","software platform","cloud platform","developer tools","api platform","workflow software","enterprise customers"]},{"id":"ai","name":"AI / machine learning","keywords":["artificial intelligence","ai company","ai-native","ai startup","machine learning platform","generative ai","llm","llms","ai products","ai-powered"]},{"id":"media","name":"Media & entertainment","keywords":["media company","entertainment","streaming","publishing","news organization","newsroom","music","film","podcast","content studio","magazine"]},{"id":"gaming","name":"Gaming","keywords":["gaming","video games","game studio","esports","players worldwide","mobile games"]},{"id":"government","name":"Government & public sector","keywords":["government","federal agency","public sector","state agency","municipal","city of","department of","defense","dod","federal"]},{"id":"nonprofit","name":"Nonprofit & social impact","keywords":["nonprofit","non-profit","501(c)(3)","charity","foundation","social impact","mission-driven nonprofit","advocacy organization","ngo"]},{"id":"climate","name":"Climate & energy","keywords":["climate","clean energy","renewable","renewables","solar","wind energy","energy storage","sustainability","carbon","decarbonization","electric vehicles","ev charging","utilities","oil and gas"]},{"id":"logistics","name":"Logistics & supply chain","keywords":["logistics company","freight","shipping","supply chain","warehousing","distribution","fulfillment","3pl","trucking","last-mile"]},{"id":"manufacturing","name":"Manufacturing & industrial","keywords":["manufacturing","manufacturer","industrial","factory","production facility","aerospace","automotive","semiconductor","hardware products"]},{"id":"real_estate","name":"Real estate & construction","keywords":["real estate","proptech","property management","construction","commercial real estate","homebuilder","architecture firm"]},{"id":"hospitality","name":"Travel & hospitality","keywords":["hospitality","hotel","hotels","travel","restaurants","restaurant","airline","tourism","food service"]},{"id":"consulting","name":"Consulting & professional services","keywords":["consulting firm","consultancy","professional services","advisory firm","accounting firm","law firm","big four","agency clients","client engagements"]},{"id":"security","name":"Cybersecurity","keywords":["cybersecurity company","security platform","threat intelligence","zero trust","security products","endpoint security"]},{"id":"consumer_tech","name":"Consumer tech & social","keywords":["consumer app","consumer apps","social network","social platform","creators","mobile app used by","millions of users","daily active users"]},{"id":"telecom","name":"Telecom & networking","keywords":["telecommunications","telecom","wireless carrier","broadband","5g","network infrastructure"]},{"id":"legal_services","name":"Legal services","keywords":["law firm","legal services","legal tech","legaltech","litigation firm","in-house legal"]},{"id":"food","name":"Food & agriculture","keywords":["food company","agriculture","agtech","farm","food and beverage","beverage","grocery","meal kit"]},{"id":"sports","name":"Sports & fitness","keywords":["athletics department","sports organization","fitness","sports league","athletes","gym","recreation center","sports medicine"]}],"metros":[{"id":"nyc","name":"New York City area","states":["NY","NJ","CT"],"aliases":["new york","new york city","nyc","manhattan","brooklyn","queens","bronx","jersey city","hoboken","newark","long island city","white plains","stamford","yonkers","new rochelle","mount vernon, ny","rye brook","rye, ny","harrison, ny","purchase, ny","tarrytown","port chester","scarsdale","mamaroneck","westchester","westchester county","greenwich, ct","norwalk, ct","darien, ct","westport, ct","fairfield county, ct","staten island","long island","garden city, ny","hempstead","mineola","melville, ny","great neck","secaucus","fort lee, nj","paramus","hackensack","morristown, nj","parsippany","edison, nj","woodbridge, nj","new brunswick","red bank","iselin","weehawken","harrison, nj","union city, nj","elizabeth, nj","summit, nj","florham park","short hills","montclair","northern new jersey","north jersey"]},{"id":"sf_bay","name":"SF Bay Area","states":["CA"],"aliases":["san francisco","sf","bay area","san jose","oakland","palo alto","mountain view","sunnyvale","menlo park","redwood city","santa clara","cupertino","berkeley","south san francisco","san mateo","fremont","silicon valley","san ramon","pleasanton","walnut creek","dublin, ca","hayward","milpitas","los gatos","campbell, ca","foster city","burlingame","san carlos","emeryville","alameda","richmond, ca","concord, ca","livermore","san rafael","novato","brisbane, ca","daly city","san bruno","belmont, ca","los altos","saratoga, ca","morgan hill","union city, ca","newark, ca"]},{"id":"la","name":"Los Angeles area","states":["CA"],"aliases":["los angeles","la","santa monica","culver city","pasadena","burbank","irvine","long beach","el segundo","playa vista","glendale","orange county","torrance","manhattan beach","venice, ca","marina del rey","beverly hills","west hollywood","hollywood","studio city","sherman oaks","encino","woodland hills","calabasas","thousand oaks","westlake village","costa mesa","newport beach","santa ana","anaheim","fullerton","tustin","lake forest, ca","mission viejo","aliso viejo","huntington beach","carson, ca","downey","whittier","monterey park","alhambra","arcadia, ca","van nuys","north hollywood","valencia, ca","santa clarita","inglewood","hawthorne, ca","redondo beach","gardena"]},{"id":"san_diego","name":"San Diego","states":["CA"],"aliases":["san diego","la jolla","carlsbad","chula vista","oceanside","escondido","san marcos, ca","vista, ca","poway","el cajon","national city","del mar","sorrento valley","encinitas","rancho bernardo"]},{"id":"seattle","name":"Seattle area","states":["WA"],"aliases":["seattle","bellevue","redmond","kirkland","tacoma","everett","renton","kent, wa","lynnwood","bothell","issaquah","sammamish","federal way","auburn, wa","tukwila","shoreline, wa","mercer island","woodinville","puyallup"]},{"id":"portland","name":"Portland","states":["OR","WA"],"aliases":["portland","beaverton","hillsboro","tigard","lake oswego","tualatin","gresham","wilsonville","vancouver, wa","clackamas","happy valley, or","milwaukie","oregon city","west linn"]},{"id":"austin","name":"Austin","states":["TX"],"aliases":["austin","round rock","cedar park","georgetown, tx","pflugerville","leander","kyle, tx","buda","san marcos, tx","lakeway","bee cave","hutto","manor, tx"]},{"id":"dallas","name":"Dallas-Fort Worth","states":["TX"],"aliases":["dallas","fort worth","plano","irving","frisco","arlington, tx","dfw","richardson","addison, tx","carrollton","garland","mckinney","allen, tx","grapevine","las colinas","coppell","denton"]},{"id":"houston","name":"Houston","states":["TX"],"aliases":["houston","the woodlands","sugar land","katy","pearland","spring, tx","cypress, tx","humble","pasadena, tx","league city","conroe","baytown","tomball","kingwood","missouri city","bellaire, tx","stafford, tx","webster, tx","clear lake"]},{"id":"san_antonio","name":"San Antonio","states":["TX"],"aliases":["san antonio","new braunfels","schertz","boerne","converse, tx","live oak, tx","selma, tx","universal city","helotes","seguin"]},{"id":"chicago","name":"Chicago area","states":["IL","IN","WI"],"aliases":["chicago","evanston","naperville","schaumburg","oak brook","oak park","skokie","deerfield, il","northbrook","lake forest, il","highland park, il","glenview","des plaines","rosemont","elk grove village","arlington heights","palatine","itasca","downers grove","lombard","lisle","wheaton","aurora, il","joliet","bolingbrook","oak lawn","tinley park","orland park","hoffman estates","rolling meadows","elmhurst, il","vernon hills","lincolnshire, il","waukegan","hammond, in","gary, in","oakbrook terrace","westmont, il","warrenville","st. charles, il","elgin"]},{"id":"boston","name":"Boston area","states":["MA","NH","RI"],"aliases":["boston","cambridge","somerville","waltham","burlington, ma","quincy","newton, ma","brookline","lexington, ma","woburn","bedford, ma","needham","wellesley","framingham","natick","marlborough, ma","andover, ma","lowell, ma","medford, ma","malden","everett, ma","watertown, ma","arlington, ma","braintree","dedham","norwood, ma","canton, ma","westwood, ma","billerica","chelmsford","acton, ma","concord, ma","maynard","lynn, ma","salem, ma","beverly, ma","danvers","peabody","wakefield, ma","reading, ma","nashua"]},{"id":"dc","name":"Washington DC area","states":["DC","VA","MD"],"aliases":["washington, dc","washington dc","washington d.c.","dc","arlington, va","arlington","alexandria","bethesda","reston","mclean","tysons","silver spring","rockville","herndon","fairfax","chantilly","falls church","vienna, va","manassas","ashburn","sterling, va","leesburg","springfield, va","annandale","dulles","gaithersburg","college park","germantown, md","laurel, md","fort meade","suitland","andrews afb","joint base andrews"]},{"id":"philadelphia","name":"Philadelphia","states":["PA","NJ","DE"],"aliases":["philadelphia","philly","king of prussia","conshohocken","wilmington, de","camden, nj","cherry hill","malvern","wayne, pa","plymouth meeting","bala cynwyd","horsham","fort washington","blue bell","exton","newark, de","mount laurel","media, pa"]},{"id":"pittsburgh","name":"Pittsburgh","states":["PA"],"aliases":["pittsburgh","cranberry township","canonsburg","monroeville","wexford","bethel park","coraopolis","moon township","robinson township"]},{"id":"atlanta","name":"Atlanta","states":["GA"],"aliases":["atlanta","alpharetta","marietta","sandy springs","buckhead","decatur, ga","dunwoody","duluth, ga","lawrenceville, ga","kennesaw","smyrna, ga","roswell, ga","johns creek","norcross","peachtree corners","peachtree city","suwanee","cumming, ga","tucker, ga","college park, ga","east point, ga"]},{"id":"miami","name":"Miami area","states":["FL"],"aliases":["miami","fort lauderdale","boca raton","west palm beach","coral gables","hialeah","doral","miami beach","hollywood, fl","pembroke pines","plantation, fl","sunrise, fl","weston, fl","miramar, fl","pompano beach","deerfield beach","delray beach","boynton beach","jupiter, fl","palm beach gardens","aventura","coral springs"]},{"id":"tampa","name":"Tampa","states":["FL"],"aliases":["tampa","st. petersburg","clearwater","brandon, fl","wesley chapel","largo","palm harbor","riverview, fl","plant city","oldsmar"]},{"id":"orlando","name":"Orlando","states":["FL"],"aliases":["orlando","kissimmee","sanford, fl","lake mary","winter park","altamonte springs","oviedo","maitland","lake nona","winter garden","clermont, fl","apopka"]},{"id":"denver","name":"Denver / Boulder","states":["CO"],"aliases":["denver","boulder","aurora, co","englewood","broomfield","lakewood, co","littleton","centennial","greenwood village","lone tree","highlands ranch","golden, co","westminster, co","thornton, co","arvada","louisville, co","lafayette, co","longmont","parker, co","castle rock"]},{"id":"phoenix","name":"Phoenix","states":["AZ"],"aliases":["phoenix","scottsdale","tempe","chandler","mesa","gilbert","glendale, az","peoria, az","surprise, az","goodyear","avondale, az","queen creek","fountain hills","paradise valley"]},{"id":"salt_lake","name":"Salt Lake City","states":["UT"],"aliases":["salt lake city","lehi","provo","draper","sandy, ut","south jordan","west jordan","murray, ut","midvale","cottonwood heights","american fork","orem","pleasant grove","ogden","layton","bountiful","west valley city","millcreek","holladay","riverton, ut","herriman","bluffdale","taylorsville"]},{"id":"minneapolis","name":"Minneapolis","states":["MN","WI"],"aliases":["minneapolis","st. paul","saint paul","st paul","twin cities","bloomington, mn","eden prairie","edina","minnetonka","plymouth, mn","maple grove","eagan","burnsville","roseville, mn","st. louis park","golden valley","brooklyn park","woodbury, mn","shakopee","hopkins, mn","richfield, mn","arden hills","chaska","lakeville","apple valley","coon rapids","blaine","maplewood, mn","fridley","hudson, wi"]},{"id":"detroit","name":"Detroit","states":["MI"],"aliases":["detroit","ann arbor","dearborn","troy, mi","southfield","auburn hills","novi","farmington hills","livonia","warren, mi","sterling heights","pontiac","royal oak","birmingham, mi","bloomfield hills","rochester hills","west bloomfield","plymouth, mi","canton, mi","wixom","madison heights","ypsilanti"]},{"id":"columbus","name":"Columbus","states":["OH"],"aliases":["columbus","westerville","worthington, oh","hilliard","grove city","gahanna","upper arlington","new albany, oh"]},{"id":"cleveland","name":"Cleveland","states":["OH"],"aliases":["cleveland","akron","beachwood","independence, oh","westlake, oh","mayfield heights","strongsville","parma","lakewood, oh","solon, oh","brecksville","mentor, oh","medina, oh","cuyahoga falls"]},{"id":"nashville","name":"Nashville","states":["TN"],"aliases":["nashville","franklin, tn","brentwood, tn","murfreesboro","smyrna, tn","hendersonville, tn","mt. juliet","mount juliet","gallatin, tn","spring hill, tn","lebanon, tn","cool springs"]},{"id":"raleigh","name":"Raleigh-Durham","states":["NC"],"aliases":["raleigh","durham","chapel hill","research triangle","cary","morrisville","apex, nc","wake forest","rtp","research triangle park","holly springs","garner, nc","knightdale","wake county"]},{"id":"charlotte","name":"Charlotte","states":["NC","SC"],"aliases":["charlotte","fort mill","rock hill","matthews, nc","mint hill","gastonia","concord, nc","kannapolis","huntersville","cornelius, nc","davidson, nc","mooresville","ballantyne","indian land","pineville, nc","monroe, nc","indian trail","belmont, nc","tega cay","lake wylie"]},{"id":"st_louis","name":"St. Louis","states":["MO","IL"],"aliases":["st. louis","saint louis","st louis","clayton, mo","chesterfield, mo","creve coeur","maryland heights","st. charles, mo","st charles, mo","o'fallon, mo","kirkwood, mo","webster groves","ballwin","earth city","belleville, il","edwardsville","o'fallon, il","brentwood, mo","town and country, mo","arnold, mo","fenton, mo","wentzville","florissant","hazelwood, mo","bridgeton, mo","st. peters","st peters","granite city","collinsville, il","fairview heights","mascoutah","scott afb","shiloh, il","swansea, il","o'fallon","ofallon, il","maryville, il","alton, il"]},{"id":"kansas_city","name":"Kansas City","states":["MO","KS"],"aliases":["kansas city","overland park","olathe","lenexa","shawnee, ks","leawood","merriam","mission, ks","prairie village","lee's summit","lees summit","independence, mo","blue springs","liberty, mo","north kansas city","gladstone, mo","raytown","grandview, mo","belton, mo","riverside, mo"]},{"id":"baltimore","name":"Baltimore","states":["MD"],"aliases":["baltimore","columbia, md","towson","owings mills","hunt valley","linthicum","glen burnie","annapolis","ellicott city","catonsville","white marsh","bel air, md","aberdeen, md","odenton","hanover, md"]},{"id":"las_vegas","name":"Las Vegas","states":["NV"],"aliases":["las vegas","henderson","north las vegas","summerlin","paradise, nv","spring valley, nv","enterprise, nv","boulder city"]},{"id":"sacramento","name":"Sacramento","states":["CA"],"aliases":["sacramento","roseville, ca","folsom","rancho cordova","elk grove","west sacramento","citrus heights","davis, ca","rocklin","el dorado hills"]},{"id":"indianapolis","name":"Indianapolis","states":["IN"],"aliases":["indianapolis","indy","carmel, in","fishers","noblesville","westfield, in","zionsville","greenwood, in","plainfield, in","avon, in","lawrence, in","brownsburg"]},{"id":"milwaukee","name":"Milwaukee","states":["WI"],"aliases":["milwaukee","waukesha","brookfield, wi","wauwatosa","west allis","menomonee falls","new berlin","glendale, wi","oak creek","pewaukee","mequon"]},{"id":"new_orleans","name":"New Orleans","states":["LA"],"aliases":["new orleans"]},{"id":"toronto","name":"Toronto","states":["ON"],"aliases":["toronto","mississauga","waterloo"]},{"id":"vancouver","name":"Vancouver","states":["BC"],"aliases":["vancouver"]},{"id":"london","name":"London","states":["UK","GB","England"],"aliases":["london"]},{"id":"dublin","name":"Dublin","states":["IE"],"aliases":["dublin"]},{"id":"berlin","name":"Berlin","states":["DE"],"aliases":["berlin"]},{"id":"bangalore","name":"Bengaluru","states":["IN"],"aliases":["bangalore","bengaluru"]},{"id":"singapore","name":"Singapore","states":["SG"],"aliases":["singapore"]},{"id":"sydney","name":"Sydney","states":["AU"],"aliases":["sydney"]},{"id":"cincinnati","name":"Cincinnati","states":["OH","KY","IN"],"aliases":["cincinnati","covington, ky","newport, ky","florence, ky","erlanger","hebron, ky","mason, oh","west chester, oh","blue ash","fairfield, oh","sharonville","lawrenceburg, in"]},{"id":"greenville_sc","name":"Greenville-Spartanburg","states":["SC"],"aliases":["greenville, sc","spartanburg","greer","simpsonville","anderson, sc","duncan, sc","upstate sc"]},{"id":"louisville","name":"Louisville","states":["KY","IN"],"aliases":["louisville","jeffersonville, in","new albany, in"]},{"id":"richmond_va","name":"Richmond","states":["VA"],"aliases":["richmond, va","glen allen","henrico","midlothian, va","chesterfield, va","mechanicsville","short pump","ashland, va","petersburg, va","colonial heights"]},{"id":"jacksonville","name":"Jacksonville","states":["FL"],"aliases":["jacksonville","ponte vedra","orange park","fernandina beach","jacksonville beach"]},{"id":"memphis","name":"Memphis","states":["TN","MS","AR"],"aliases":["memphis","southaven","germantown, tn"]},{"id":"birmingham","name":"Birmingham","states":["AL"],"aliases":["birmingham, al","hoover, al"]},{"id":"oklahoma_city","name":"Oklahoma City","states":["OK"],"aliases":["oklahoma city","edmond, ok","norman, ok"]},{"id":"tulsa","name":"Tulsa","states":["OK"],"aliases":["tulsa","broken arrow"]},{"id":"omaha","name":"Omaha","states":["NE","IA"],"aliases":["omaha","council bluffs"]},{"id":"des_moines","name":"Des Moines","states":["IA"],"aliases":["des moines","west des moines","ankeny"]},{"id":"albuquerque","name":"Albuquerque","states":["NM"],"aliases":["albuquerque","rio rancho"]},{"id":"tucson","name":"Tucson","states":["AZ"],"aliases":["tucson"]},{"id":"el_paso","name":"El Paso","states":["TX"],"aliases":["el paso"]},{"id":"boise","name":"Boise","states":["ID"],"aliases":["boise","meridian, id","nampa","eagle, id","kuna","star, id","caldwell, id"]},{"id":"spokane","name":"Spokane","states":["WA","ID"],"aliases":["spokane","coeur d'alene"]},{"id":"colorado_springs","name":"Colorado Springs","states":["CO"],"aliases":["colorado springs"]},{"id":"reno","name":"Reno","states":["NV"],"aliases":["reno","sparks, nv"]},{"id":"buffalo","name":"Buffalo","states":["NY"],"aliases":["buffalo","amherst, ny"]},{"id":"rochester_ny","name":"Rochester","states":["NY"],"aliases":["rochester, ny"]},{"id":"hartford","name":"Hartford","states":["CT"],"aliases":["hartford","west hartford","new britain","glastonbury","farmington, ct","windsor, ct","east hartford","wethersfield","rocky hill","bloomfield, ct","middletown, ct","manchester, ct","simsbury","avon, ct"]},{"id":"providence","name":"Providence","states":["RI","MA"],"aliases":["providence","warwick, ri","cranston"]},{"id":"greensboro","name":"Greensboro / Winston-Salem","states":["NC"],"aliases":["greensboro","winston-salem","high point"]},{"id":"charleston_sc","name":"Charleston","states":["SC"],"aliases":["charleston, sc","north charleston","mount pleasant, sc","summerville, sc"]},{"id":"columbia_sc","name":"Columbia","states":["SC"],"aliases":["columbia, sc","lexington, sc"]},{"id":"knoxville","name":"Knoxville","states":["TN"],"aliases":["knoxville","oak ridge"]},{"id":"dayton","name":"Dayton","states":["OH"],"aliases":["dayton","beavercreek","fairborn"]},{"id":"grand_rapids","name":"Grand Rapids","states":["MI"],"aliases":["grand rapids","allendale, mi","zeeland","holland, mi","wyoming, mi","kentwood","grandville","walker, mi","hudsonville","east grand rapids"]},{"id":"madison","name":"Madison","states":["WI"],"aliases":["madison, wi"]},{"id":"fresno","name":"Fresno","states":["CA"],"aliases":["fresno"]},{"id":"honolulu","name":"Honolulu","states":["HI"],"aliases":["honolulu"]},{"id":"bentonville","name":"Northwest Arkansas","states":["AR"],"aliases":["bentonville","rogers, ar","fayetteville, ar","springdale, ar"]},{"id":"wichita","name":"Wichita","states":["KS"],"aliases":["wichita","derby, ks","andover, ks","newton, ks","el dorado, ks","haysville","park city, ks","maize, ks","goddard, ks","augusta, ks","mcconnell afb"]},{"id":"hampton_roads","name":"Hampton Roads (Norfolk / Virginia Beach)","states":["VA"],"aliases":["norfolk, va","virginia beach","chesapeake, va","newport news","hampton, va","portsmouth, va","suffolk, va","williamsburg, va","hampton roads"]},{"id":"albany_ny","name":"Albany","states":["NY"],"aliases":["albany, ny","schenectady","troy, ny","saratoga springs","clifton park"]},{"id":"syracuse","name":"Syracuse","states":["NY"],"aliases":["syracuse"]},{"id":"harrisburg","name":"Harrisburg","states":["PA"],"aliases":["harrisburg","mechanicsburg","camp hill","hershey","carlisle, pa"]},{"id":"lehigh_valley","name":"Lehigh Valley","states":["PA","NJ"],"aliases":["allentown","bethlehem, pa","easton, pa","lehigh valley"]},{"id":"lancaster_pa","name":"Lancaster / York","states":["PA"],"aliases":["lancaster, pa","york, pa"]},{"id":"baton_rouge","name":"Baton Rouge","states":["LA"],"aliases":["baton rouge","gonzales, la","denham springs"]},{"id":"little_rock","name":"Little Rock","states":["AR"],"aliases":["little rock","north little rock","conway, ar","benton, ar"]},{"id":"lincoln_ne","name":"Lincoln","states":["NE"],"aliases":["lincoln, ne"]},{"id":"sioux_falls","name":"Sioux Falls","states":["SD"],"aliases":["sioux falls"]},{"id":"fargo","name":"Fargo","states":["ND","MN"],"aliases":["fargo","moorhead, mn","west fargo"]},{"id":"anchorage","name":"Anchorage","states":["AK"],"aliases":["anchorage","eagle river, ak","wasilla","jber"]},{"id":"chattanooga","name":"Chattanooga","states":["TN","GA"],"aliases":["chattanooga","cleveland, tn"]},{"id":"huntsville","name":"Huntsville","states":["AL"],"aliases":["huntsville","madison, al","decatur, al","redstone arsenal"]},{"id":"mobile","name":"Mobile","states":["AL"],"aliases":["mobile, al","daphne, al","fairhope"]},{"id":"jackson_ms","name":"Jackson","states":["MS"],"aliases":["jackson, ms","ridgeland, ms","madison, ms","brandon, ms","flowood"]},{"id":"lexington_ky","name":"Lexington","states":["KY"],"aliases":["lexington, ky","georgetown, ky","nicholasville","winchester, ky"]},{"id":"toledo","name":"Toledo","states":["OH","MI"],"aliases":["toledo","perrysburg","maumee","sylvania, oh"]},{"id":"worcester","name":"Worcester","states":["MA"],"aliases":["worcester","shrewsbury, ma","westborough"]},{"id":"springfield_ma","name":"Springfield","states":["MA","CT"],"aliases":["springfield, ma","chicopee","holyoke","westfield, ma","enfield, ct"]},{"id":"new_haven","name":"New Haven","states":["CT"],"aliases":["new haven","hamden","west haven","milford, ct","wallingford, ct","branford"]},{"id":"savannah","name":"Savannah","states":["GA","SC"],"aliases":["savannah","pooler","richmond hill, ga","hilton head"]},{"id":"augusta_ga","name":"Augusta","states":["GA","SC"],"aliases":["augusta, ga","evans, ga","martinez, ga","aiken","north augusta","fort gordon"]},{"id":"pensacola","name":"Pensacola","states":["FL"],"aliases":["pensacola","gulf breeze","milton, fl","navarre"]},{"id":"tallahassee","name":"Tallahassee","states":["FL"],"aliases":["tallahassee"]},{"id":"gainesville_fl","name":"Gainesville","states":["FL"],"aliases":["gainesville, fl","alachua"]},{"id":"fort_myers","name":"Fort Myers / Naples","states":["FL"],"aliases":["fort myers","cape coral","naples, fl","bonita springs","estero"]},{"id":"sarasota","name":"Sarasota / Bradenton","states":["FL"],"aliases":["sarasota","bradenton","lakewood ranch","venice, fl"]},{"id":"bakersfield","name":"Bakersfield","states":["CA"],"aliases":["bakersfield"]},{"id":"inland_empire","name":"Inland Empire","states":["CA"],"aliases":["riverside, ca","san bernardino","ontario, ca","rancho cucamonga","corona, ca","fontana","moreno valley","temecula","murrieta","redlands","chino","inland empire"]},{"id":"stockton","name":"Stockton / Modesto","states":["CA"],"aliases":["stockton","modesto","tracy, ca","manteca","lodi, ca"]},{"id":"santa_barbara","name":"Santa Barbara","states":["CA"],"aliases":["santa barbara","goleta","carpinteria"]},{"id":"eugene","name":"Eugene","states":["OR"],"aliases":["eugene","springfield, or"]},{"id":"salem_or","name":"Salem","states":["OR"],"aliases":["salem, or","keizer"]},{"id":"olympia","name":"Olympia","states":["WA"],"aliases":["olympia","lacey, wa","tumwater"]},{"id":"lubbock","name":"Lubbock","states":["TX"],"aliases":["lubbock"]},{"id":"corpus_christi","name":"Corpus Christi","states":["TX"],"aliases":["corpus christi"]},{"id":"mcallen","name":"McAllen / Rio Grande Valley","states":["TX"],"aliases":["mcallen","edinburg, tx","mission, tx","pharr","harlingen","brownsville"]},{"id":"killeen","name":"Killeen / Temple","states":["TX"],"aliases":["killeen","temple, tx","fort hood","fort cavazos","harker heights","belton, tx"]},{"id":"waco","name":"Waco","states":["TX"],"aliases":["waco"]},{"id":"lansing","name":"Lansing","states":["MI"],"aliases":["lansing","east lansing","okemos"]},{"id":"kalamazoo","name":"Kalamazoo","states":["MI"],"aliases":["kalamazoo","portage, mi","battle creek"]},{"id":"fort_wayne","name":"Fort Wayne","states":["IN"],"aliases":["fort wayne"]},{"id":"south_bend","name":"South Bend","states":["IN","MI"],"aliases":["south bend","mishawaka","elkhart","notre dame, in"]},{"id":"evansville","name":"Evansville","states":["IN","KY"],"aliases":["evansville","henderson, ky","newburgh, in"]},{"id":"peoria","name":"Peoria","states":["IL"],"aliases":["peoria, il","east peoria","pekin","morton, il"]},{"id":"champaign","name":"Champaign-Urbana","states":["IL"],"aliases":["champaign","urbana, il","savoy, il"]},{"id":"quad_cities","name":"Quad Cities","states":["IA","IL"],"aliases":["davenport","bettendorf","moline","rock island","quad cities"]},{"id":"cedar_rapids","name":"Cedar Rapids / Iowa City","states":["IA"],"aliases":["cedar rapids","iowa city","coralville","marion, ia"]},{"id":"green_bay","name":"Green Bay / Fox Valley","states":["WI"],"aliases":["green bay","de pere","appleton","oshkosh","neenah"]},{"id":"rochester_mn","name":"Rochester","states":["MN"],"aliases":["rochester, mn"]},{"id":"billings","name":"Billings","states":["MT"],"aliases":["billings"]},{"id":"santa_fe","name":"Santa Fe","states":["NM"],"aliases":["santa fe","los alamos"]},{"id":"wilmington_nc","name":"Wilmington","states":["NC"],"aliases":["wilmington, nc","leland, nc"]},{"id":"asheville","name":"Asheville","states":["NC"],"aliases":["asheville","hendersonville, nc"]},{"id":"roanoke","name":"Roanoke","states":["VA"],"aliases":["roanoke","salem, va","blacksburg"]},{"id":"scranton","name":"Scranton / Wilkes-Barre","states":["PA"],"aliases":["scranton","wilkes-barre","wilkes barre"]},{"id":"akron_canton","name":"Akron / Canton","states":["OH"],"aliases":["canton, oh","north canton","massillon"]},{"id":"youngstown","name":"Youngstown","states":["OH","PA"],"aliases":["youngstown","boardman","warren, oh"]},{"id":"flint","name":"Flint / Saginaw","states":["MI"],"aliases":["flint","saginaw","bay city, mi","midland, mi"]},{"id":"erie","name":"Erie","states":["PA"],"aliases":["erie, pa"]},{"id":"duluth","name":"Duluth","states":["MN","WI"],"aliases":["duluth","superior, wi"]}],"us_states":{"AL":"alabama","AK":"alaska","AZ":"arizona","AR":"arkansas","CA":"california","CO":"colorado","CT":"connecticut","DE":"delaware","DC":"district of columbia","FL":"florida","GA":"georgia","HI":"hawaii","ID":"idaho","IL":"illinois","IN":"indiana","IA":"iowa","KS":"kansas","KY":"kentucky","LA":"louisiana","ME":"maine","MD":"maryland","MA":"massachusetts","MI":"michigan","MN":"minnesota","MS":"mississippi","MO":"missouri","MT":"montana","NE":"nebraska","NV":"nevada","NH":"new hampshire","NJ":"new jersey","NM":"new mexico","NY":"new york","NC":"north carolina","ND":"north dakota","OH":"ohio","OK":"oklahoma","OR":"oregon","PA":"pennsylvania","RI":"rhode island","SC":"south carolina","SD":"south dakota","TN":"tennessee","TX":"texas","UT":"utah","VT":"vermont","VA":"virginia","WA":"washington","WV":"west virginia","WI":"wisconsin","WY":"wyoming"},"agency_names":["robert half","teksystems","insight global","aerotek","randstad","adecco","kforce","apex systems","kelly services","manpower","manpowergroup","hays","michael page","page group","modis","akkodis","beacon hill","cybercoders","jobot","motion recruitment","vaco","collabera","mindlance","experis","allegis","aston carter","actalent","express employment","spherion","volt","staffmark","addison group","lhh","system one","the judge group","russell tobin","hire quest","talentburst","pyramid consulting","artech","diverse lynx","nesco resource","yoh","solomon page","creative circle","atrium staffing","aquent","onward search","tandym","korn ferry","heidrick","betts recruiting","hirequest"],"agency_name_words":["staffing","recruiting","recruitment","talent solutions","workforce solutions","staffing solutions","placement","headhunters","employment agency","personnel","talent partners","search partners"],"agency_phrases":["on behalf of our client","our client is seeking","our client is looking","our client is hiring","our client has","for our client","our client, a","our client, one of","w2 or c2c","c2c or w2","w2/c2c","corp to corp","corp-to-corp","1099 or w2","contract to hire through","this position is with our client","our customer, a","on behalf of a client","on behalf of our clients","on behalf of a fortune","on behalf of a leading","on behalf of a global","on behalf of a large","on behalf of a major","on behalf of a national","on behalf of a well-known","on behalf of one of our clients","fortune 500 client","fortune 100 client","fortune 1000 client","our direct client","for a direct client","a client of ours"],"evergreen_phrases":["always accepting applications","always looking for talented","always looking for great","always looking for exceptional","always looking for passionate","always looking for top talent","always looking for new talent","join our talent","join our talent pool","join our talent community","join our talent network","added to our talent pool","general application","general interest application","pipeline for future","pipeline requisition","pipeline posting","evergreen requisition","evergreen posting","evergreen position","evergreen role","evergreen opening","this is an evergreen","not currently hiring","no specific opening","no current openings","expression of interest","submit your resume for future","for future consideration","for consideration for future"],"ats_domains":["greenhouse.io","lever.co","myworkdayjobs.com","workday.com","ashbyhq.com","smartrecruiters.com","icims.com","jobvite.com","bamboohr.com","breezy.hr","workable.com","recruitee.com","taleo.net","successfactors.com","paylocity.com","ultipro.com","rippling.com","dover.com","jazzhr.com","applytojob.com","teamtailor.com"],"aggregator_domains":["adzuna.com","indeed.com","linkedin.com","ziprecruiter.com","glassdoor.com","simplyhired.com","monster.com","careerbuilder.com","jooble.org","talent.com","lensa.com","jobright.ai","dice.com","snagajob.com"],"vocab_common":{"stop":["abilities","ability","able","about","above","accept","accepted","accepting","access","accomplish","accomplished","accordance","according","account","accountable","accreditation","accredited","accuracy","accurate","accurately","achieve","achieved","across","act","acting","action","actions","active","actively","activities","activity","actual","actually","adapt","adaptable","add","added","adding","addition","additional","address","addressing","adept","adjust","admin","advance","advancement","advantage","advocate","affect","afford","after","again","against","ahead","aim","aligned","all","allow","allows","almost","along","alongside","already","also","although","always","amazing","ambiguity","ambitious","among","and","annual","another","answer","anticipate","any","anyone","anything","applicant","applicants","application","applications","apply","appreciate","approach","approachable","appropriate","approved","approximately","are","areas","around","arrange","arranging","articulate","ask","asked","asking","aspects","assess","assessing","assigned","assignments","assistance","assistant","associate","associates","attend","attending","attention","attitude","attract","authorization","authorized","available","avoid","aware","awareness","away","bachelor","bachelors","back","background","bar","based","basic","because","become","becoming","been","before","begin","beginning","behind","being","believe","below","benefit","benefits","best","better","between","beyond","big","bonus","both","bright","broad","budget","build","building","bulk","busy","but","call","calm","can","candidate","candidates","cannot","capable","capacity","career","careful","caring","carry","carrying","case","catch","cause","certain","certification","challenge","challenges","challenging","champion","change","changes","changing","check","choose","citizen","citizenship","clear","clearance","clearances","clearly","client","close","closely","collaborate","collaborating","collaboration","collaborative","colleagues","color","come","comes","comfort","comfortable","coming","commitment","committed","common","communicate","communicating","communicator","commute","commuting","compact","company","compassionate","compensation","competing","competitive","complete","completed","completion","composure","concise","confident","connect","consider","considered","consistent","consistently","constantly","contact","contribute","contributing","contributor","convey","core","correct","could","coursework","create","created","creating","creative","credential","credentials","critical","cross","culture","curious","current","currently","cutting","daily","data","day","days","daytime","deadline","deadlines","deal","dedicated","deep","deeply","define","defined","degree","degrees","deliver","delivering","demand","demanding","demonstrate","demonstrated","dental","dependable","describe","deserve","desire","desired","detail","detailed","details","determine","determined","develop","developing","development","did","difference","different","difficult","diligent","diploma","diplomas","direct","directly","disability","discretion","discuss","diverse","doctoral","doctorate","document","does","doing","done","double","down","downtown","drive","driven","drives","due","during","dynamic","each","eager","early","ease","easily","easy","education","effective","effectively","efficiency","efficient","efficiently","effort","efforts","eight","either","elevate","eligibility","eligible","else","embrace","empathetic","employee","employees","employer","employment","empower","enable","encourage","end","energetic","energy","engage","engaged","engaging","engineering","enjoy","enjoys","enough","enrolled","enrollment","ensure","ensuring","enthusiasm","enthusiastic","entire","environment","equal","equity","equivalency","equivalent","essential","establish","etc","even","evening","evenings","ever","every","everyday","everything","evolve","evolving","exceed","exceeding","excellent","exceptional","excited","exciting","execute","executing","executive","executives","exemplary","expect","expectations","expected","experience","experienced","experiences","expert","explore","exposure","extensive","extra","eye","face","facing","familiar","familiarity","fast","feel","fellow","few","field","find","first","fit","five","flex","flexibility","flexible","focus","focused","follow","following","for","force","forward","foster","four","free","fridays","friendly","from","front","fulfilling","full","fun","further","gain","gather","ged","gender","general","generally","genuine","get","gets","getting","give","given","gives","goal","goals","goes","going","gone","good","got","grad","grads","graduate","graduates","graduating","graduation","great","greater","grit","group","grow","growing","grows","growth","guide","had","half","hand","handle","handling","hands","happen","happy","hard","hardworking","has","have","having","headquarters","health","healthcare","hear","heart","help","helping","helps","her","here","hers","herself","high","higher","highest","highly","him","himself","hire","hiring","his","hold","holidays","honest","hope","hour","hourly","hours","house","how","however","humble","hybrid","ideal","ideally","ideas","identify","identity","impact","impactful","important","improve","improving","include","includes","including","incredible","independently","individual","individuals","influence","initiative","innovative","insight","inspire","insurance","integrity","intellectual","interest","interested","interests","into","invest","involved","issues","its","itself","job","jobs","joining","judgment","just","keen","keep","keeping","kind","knowledge","known","law","lead","leader","leaders","leading","learn","learner","learning","least","less","level","leverage","license","licensed","licenses","licensure","life","lift","like","likely","listen","listening","little","live","located","location","locations","long","look","looking","lots","love","loves","low","made","maintain","maintaining","major","make","makes","making","manage","management","manager","managers","manner","many","master","masters","match","matter","matters","maximize","maximum","may","meaningful","medical","meet","meeting","member","members","mentor","mentoring","mentors","mid","might","mindset","minimal","minimum","mission","modern","momentum","mondays","month","monthly","months","more","morning","mornings","most","motivate","motivated","move","moving","much","multi","multiple","multiplier","multistate","multitask","multitasking","must","myself","national","natural","nature","navigate","near","necessary","need","needed","needs","neither","never","new","next","nice","night","nights","nine","non","nor","normal","not","now","occasional","occasionally","off","offer","office","offices","often","once","one","ongoing","only","onsite","onto","open","opportunities","opportunity","order","organized","organizing","orientation","oriented","origin","other","others","otherwise","our","ours","ourselves","out","outside","outstanding","over","overall","overnight","overtime","own","ownership","pace","paced","paid","part","participate","participates","partners","party","passion","passionate","pay","people","per","perfect","perform","perhaps","personal","personality","perspective","phd","pick","pivot","place","plan","play","pleasant","please","plenty","plus","point","polished","position","positions","positive","possible","post","potential","practical","pre","precise","preference","preferred","prepare","preparing","present","presenting","pride","prior","prioritize","prioritizing","proactive","proactively","problem","problems","produce","product","productive","professional","professionals","proficiency","proficient","program","progress","promote","prompt","proper","protect","protected","proud","proven","provide","providing","pursue","pursuing","push","put","qualification","qualifications","qualified","quick","quickly","race","raise","rapid","rapidly","rather","reach","readiness","ready","real","really","reason","receive","recent","recently","recognize","recommend","reduce","regard","regular","regularly","related","relevant","reliable","religion","relocate","relocation","rely","remain","remarkable","remote","reports","represent","require","required","requirement","requirements","resilient","resolve","resourceful","respect","respond","responsibilities","responsibility","responsive","result","resume","resumes","retirement","review","reviewed","reviews","rewarding","rich","right","rigor","rigorous","rise","robust","role","roles","rolling","run","running","salary","same","school","science","seamless","seamlessly","secret","seek","seeking","self","senior","sense","serve","services","set","setting","seven","several","sex","sexual","shall","share","sharp","she","shift","shifts","short","should","show","side","similar","simple","simply","since","sincere","single","six","skill","skilled","skills","smart","smooth","smoothly","software","solid","solve","solving","some","special","spirit","sponsorship","staff","stakeholders","stand","standard","start","starting","state","status","stay","step","steps","stock","stop","straightforward","stretch","strive","strong","strongly","style","success","successful","successfully","such","suggest","suite","summary","superb","support","supporting","supportive","sure","systems","take","taking","talented","task","tasks","team","teammates","teams","ten","tenacious","than","that","the","their","theirs","them","themselves","then","there","therefore","these","they","thinking","third","this","those","though","thoughtful","three","thrive","thrives","through","throughout","thus","tight","time","timely","together","tolerance","too","top","tough","toward","towards","track","training","travel","traveling","truly","trust","trusted","try","tuition","turn","two","typical","ultimately","under","understanding","unique","unless","until","upon","urgency","use","used","useful","uses","using","vacation","valid","value","valued","values","variety","various","versatile","very","veteran","via","view","visa","vision","want","warm","was","way","ways","week","weekend","weekends","weekly","welcome","welcomes","well","were","what","whatever","when","whenever","where","whereas","wherever","whether","which","while","who","whoever","whole","whom","whose","why","wide","will","willing","willingness","win","wins","wish","with","within","without","wonderful","work","working","works","world","worth","would","write","year","years","yes","yet","you","your","yours","yourself","yourselves"],"low":["accommodation","advanced","age","analysis","analyst","analytics","analyze","apis","assist","audit","aws","base","basis","board","bring","builds","business","care","center","certificate","checks","city","clean","clients","clinical","cloud","coach","code","commercial","communication","community","companies","complex","compliance","computer","conduct","confidential","consideration","consumer","contingent","contract","control","controls","coordinate","corporate","count","coverage","customer","customers","dashboards","dbt","decisions","distribution","documentation","drug","duties","engineer","engineers","enterprise","estimate","excel","federal","final","finance","financial","firm","freight","fully","fundamentals","hires","home","hospital","hospitals","industry","information","intern","internal","join","junior","key","leadership","leave","local","logistics","machine","managing","manufacturing","marketing","materials","meetings","metrics","military","modeling","models","note","obtain","offers","onboarding","operations","organization","parental","patient","patients","payroll","performance","person","pipelines","planning","plans","platform","portfolio","posting","power","practice","processes","production","products","programs","project","projects","provided","pto","python","quality","quarterly","reasonable","record","recruiting","reflects","regional","reimbursement","report","reporting","request","research","results","river","saas","sales","schedule","scheduling","screen","service","serving","site","small","specialist","sponsor","sql","staffing","standards","statement","states","stipend","stores","strategy","students","submit","summer","supervise","supports","system","talent","target","tech","technical","test","testing","tests","tools","train","united","warehouse","weeks","writing"],"mid":["academic","accessibility","accommodations","accountant","accounting","accounts","acls","acquisition","acute","administer","administration","administrator","adoption","ads","adult","advisor","agencies","agency","agile","airflow","algorithms","analyses","analysts","analytical","analyzing","ancestry","api","app","apps","architecture","arr","assembly","assessments","assets","assignment","assurance","atlanta","attainment","audits","austin","author","authority","autocad","automate","automation","average","azure","backend","bank","banking","batch","bdr","bed","bilingual","billing","biology","bls","blue","bluebonnet","book","boot","brand","brands","bsn","buckeye","budgets","buildings","built","businesses","calendar","calendars","calls","campaign","campus","capital","card","carrier","cases","causal","cdl","cedar","centers","central","ceo","certified","cfo","chain","channels","chicago","choice","civil","claims","class","classes","classroom","clinic","clinicians","clinics","closing","coaching","coding","cold","college","colorado","columbus","commerce","commission","committees","communications","component","components","construction","consulting","content","continuous","contractors","contracts","conversion","convert","cook","coordination","coordinator","cost","counsel","counts","county","course","courses","court","cpa","cpg","credit","creed","creek","critically","crm","css","curriculum","custom","cybersecurity","cycle","dallas","databases","date","dates","december","defense","delivery","denver","department","depending","depends","deploy","description","designer","designers","designing","designs","desk","detection","developer","developers","device","devices","devops","differential","digital","direction","director","directors","discovery","distributed","district","docker","documents","dod","doe","domain","draft","drawings","driver","drivers","driving","eastern","economics","edtech","eeo","effectiveness","ehr","electrical","email","emails","emergency","employers","encouraged","engagement","english","entities","entries","epic","equipment","erp","evaluate","evaluation","event","events","expansion","experimentation","experiments","expertise","experts","explain","expression","extension","external","facilitate","facilitation","faculty","families","family","feature","features","feedback","figma","files","filings","findings","fintech","fleet","floating","food","foods","forecast","forecasting","forecasts","fort","fortune","framework","franklin","friday","functions","future","gaap","gainsight","gcp","genetic","git","github","glance","goods","google","government","grafana","granite","graphic","grocery","ground","groups","guides","hdhp","hill","holiday","housing","hris","hrs","hsa","html","hubspot","hvac","iii","illinois","immediately","implementation","improvement","improvements","inbound","incentive","incident","independent","industrial","inference","infrastructure","initiatives","inside","insights","instagram","instructional","instruments","intake","integrate","integration","intelligence","intensive","interaction","interns","internship","internships","interviews","inventory","investigate","investigations","invoices","ios","january","java","javascript","journal","june","kafka","keystone","kubernetes","lab","labor","labs","lake","large","launch","launches","layouts","leads","ledger","legal","lifecycle","line","lines","linkedin","linux","listed","litigation","lms","load","log","lone","looker","loop","lumen","maintains","maintenance","managed","manufactures","marital","market","mba","measure","med","media","meta","methods","microservices","microsoft","midwest","mill","million","mobile","mobility","model","modules","monday","monitor","monitoring","mountain","mutual","negotiation","net","netsuite","network","networking","north","notes","numbers","nurse","nurses","nursing","nyc","obtained","ohio","online","operate","operates","operating","optimization","optimize","orders","organizational","ote","outbound","outcomes","outpatient","overview","owners","owns","package","packages","pandas","paralegal","park","partnerships","parts","pass","payments","peak","permitted","pharmacists","pharmacy","phone","physical","piedmont","pipeline","plant","plants","platforms","pmp","pms","policies","policy","postgresql","powerpoint","ppo","practices","prairie","pregnancy","preparation","presence","presentation","pricing","primary","private","procedures","processing","procurement","programming","progressive","promotion","properties","property","prospect","protocols","prototyping","provider","provides","psychology","public","publications","publish","pull","pytorch","qualify","quantitative","questions","quickbooks","quota","rate","react","read","reading","recommendations","reconcile","reconciliations","records","recovery","recurring","reference","region","registered","registration","regression","regulatory","relational","relations","relationships","release","renewals","repair","representative","requests","researcher","residential","residents","resource","response","responses","restaurants","retail","retailers","retention","revenue","revit","rfis","ridge","ridgeline","risk","roadmap","robotics","robots","room","rotation","rules","runs","safety","salesforce","san","sap","scale","schedules","schools","scientist","scope","screening","scripting","sdr","sdrs","search","seattle","section","security","seeks","selection","seo","series","sessions","sets","ship","shipping","showing","shown","significant","simulation","sites","snowflake","social","sold","solutions","someone","south","sox","spanish","spark","specialty","spring","square","sre","stage","statements","statistical","statistics","store","storyline","streaming","street","structured","structures","studies","studio","study","submittals","subscription","summarize","supervising","supplier","supply","surg","surgical","survey","surveys","tableau","tables","targets","tax","teach","teacher","teaching","technician","technicians","technologies","technology","terraform","territory","texas","therapy","timelines","tool","tooling","tracking","transfer","transfers","translate","transparency","transportation","triage","trial","trials","troubleshoot","troubleshooting","truck","tuesdays","twin","typescript","unable","union","unit","units","university","update","upgrades","usability","user","validate","valley","variance","variances","vehicle","vendor","vendors","venues","verbal","verify","vested","video","visas","visits","visual","wcag","web","wellness","west","wireframes","workday","workflows","workplace","workshops","workspace","written","york","zone"]}} /* @@TAXONOMY_END@@ */;

  var ENGINE_VERSION = '2.1.0';
  var DAY = 86400000;

  /* ---------------------------------------------------------------- utils */
  // Text in. The BOM, the C0 separators and NEL are dropped / turned into a
  // newline: they're the only characters JS and Python disagree on as
  // whitespace, so with them gone \s and trim() match the server engine.
  var ODD_CH = /[\uFEFF\u001C-\u001F\u0085]/;
  function str(v) { var s = v == null ? '' : String(v); return ODD_CH.test(s) ? s.replace(/[\uFEFF\u001C-\u001F]/g, '').replace(/\u0085/g, '\n') : s; }
  function lc(v) { return str(v).toLowerCase(); }
  function rhu(x) { return Math.floor(x + 0.5); }               // round half up (== Python floor(x+0.5))
  function round1(x) { return Math.floor(x * 10 + 0.5) / 10; }
  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }   // a key like "constructor" is data, not a method
  function dict() { return Object.create(null); }
  function uniq(arr) { var o = [], s = {}; for (var i = 0; i < arr.length; i++) { var k = arr[i]; if (!Object.prototype.hasOwnProperty.call(s, k)) { s[k] = 1; o.push(k); } } return o; }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }
  function trunc(s, n) {
    // normalise only a prefix that is surely long enough (a 200 KB paragraph is
    // cut thousands of times while parsing) - same result as doing the whole string
    var raw = str(s), lim = n * 4 + 64;
    s = (raw.length > lim ? raw.slice(0, lim) : raw).replace(/\s+/g, ' ').trim();
    if (raw.length > lim && s.length <= n) s = raw.replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    var cut = n - 1, c = s.charCodeAt(cut - 1);
    if (c >= 0xD800 && c <= 0xDBFF) cut--;   // never split an emoji in half
    return s.slice(0, cut).replace(/\s+\S*$/, '') + '…';
  }
  var B4 = '(?<![A-Za-z0-9])';
  var AF = '(?![A-Za-z0-9+#&])';
  var WORD_RE_CACHE = {}, WORD_RE_N = 0;
  function wordRe(phrase, flags) {
    if (flags) return new RegExp(B4 + escRe(phrase) + AF, flags);
    var k = '\u0001' + phrase, r = WORD_RE_CACHE[k];
    if (!r) {
      if (++WORD_RE_N > 8000) { WORD_RE_CACHE = {}; WORD_RE_N = 1; }
      r = WORD_RE_CACHE[k] = new RegExp(B4 + escRe(phrase) + AF);
    }
    return r;
  }
  // the substring check is only a fast pre-filter: a whole-word hit is always a substring hit
  function hasWord(textLower, phrase) { return textLower.indexOf(phrase) !== -1 && wordRe(phrase).test(textLower); }
  function hasAnyWord(textLower, list) { for (var i = 0; i < list.length; i++) { if (hasWord(textLower, list[i])) return list[i]; } return null; }

  function normText(s) {
    return str(s)
      .replace(/\r/g, '')
      .replace(/[\u2028\u2029\u0085]/g, '\n')
      .replace(/[\uFEFF\u001C-\u001F\u200B]/g, '')
      .replace(/[‘’‛′]/g, "'")
      .replace(/[“”″]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/[   \t]/g, ' ')
      .replace(/[•●▪◦‣⁃·]/g, '\n• ')
      .replace(/ {2,}/g, ' ');
  }

  var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;
  function parseTime(v) {
    // ISO 8601 only (what the backend and the demo corpus send). A naive
    // timestamp is read as UTC - the same rule the server uses - so a job is
    // never "a day older" in the browser than on the server.
    if (v == null || v === '') return null;
    if (isNum(v)) return Math.floor(v);
    var m = ISO_RE.exec(str(v).trim());
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], hh = m[4] ? +m[4] : 0, mi = m[5] ? +m[5] : 0, ss = m[6] ? +m[6] : 0;
    var ms = m[7] ? +(m[7] + '00').slice(0, 3) : 0;
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || hh > 23 || mi > 59 || ss > 60) return null;
    var t = Date.UTC(y, mo - 1, d, hh, mi, ss, ms);
    if (m[8] && m[8] !== 'Z') {
      var sign = m[8].charAt(0) === '-' ? -1 : 1, digits = m[8].slice(1).replace(':', '');
      t -= sign * (parseInt(digits.slice(0, 2), 10) * 60 + parseInt(digits.slice(2, 4), 10)) * 60000;
    }
    return t;
  }

  /* ------------------------------------------------------- taxonomy index */
  var IDX = null;
  function idx() {
    if (IDX) return IDX;
    if (!TAX) throw new Error('job-engine: taxonomy missing');
    var I = { skill: dict(), family: dict(), role: dict(), roleOrder: [], adj: dict(), ind: dict(), metro: dict() };
    TAX.skills.forEach(function (s, i) { s._i = i; I.skill[s.id] = s; if (s.family) { (I.family[s.family] = I.family[s.family] || []).push(s.id); } });
    TAX.roles.forEach(function (r, i) { r._i = i; I.role[r.id] = r; I.roleOrder.push(r.id); });
    TAX.role_adj.forEach(function (t) { I.adj[t[0] + '|' + t[1]] = t[2]; I.adj[t[1] + '|' + t[0]] = t[2]; });
    TAX.industries.forEach(function (d) { I.ind[d.id] = d; });
    TAX.metros.forEach(function (m) { I.metro[m.id] = m; });
    // plain skill aliases -> one alternation, longest first
    var aliasMap = dict(), aliases = [];
    TAX.skills.forEach(function (s) { (s.aliases || []).forEach(function (a) { if (!Object.prototype.hasOwnProperty.call(aliasMap, a)) { aliasMap[a] = s.id; aliases.push(a); } }); });
    aliases.sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
    I.aliasMap = aliasMap;
    I.aliasRe = new RegExp(B4 + '(' + aliases.map(escRe).join('|') + ')' + AF, 'g');
    var csMap = dict(), csAlt = dict(), cs = [];
    // one spelling can carry two meanings ("DBT" the data tool, "DBT" the therapy): the context words decide
    TAX.skills.forEach(function (s) { (s.cs || []).forEach(function (a) { if (!Object.prototype.hasOwnProperty.call(csMap, a)) { csMap[a] = s.id; cs.push(a); } else if (csMap[a] !== s.id) { (csAlt[a] = csAlt[a] || []).push(s.id); } }); });
    I.csAlt = csAlt;
    cs.sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
    I.csMap = csMap;
    I.csRe = new RegExp(B4 + '(' + cs.map(escRe).join('|') + ')' + AF, 'g');
    // role patterns
    var rmap = dict(), rpats = [];
    TAX.roles.forEach(function (r) { r.patterns.forEach(function (p) { if (!Object.prototype.hasOwnProperty.call(rmap, p)) { rmap[p] = r.id; rpats.push(p); } }); });
    rpats.sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
    I.roleMap = rmap;
    I.roleRe = new RegExp(B4 + '(' + rpats.map(escRe).join('|') + ')' + AF, 'g');
    // metro aliases
    var mmap = dict(), mal = [];
    TAX.metros.forEach(function (m) { m.aliases.forEach(function (a) { if (!Object.prototype.hasOwnProperty.call(mmap, a)) { mmap[a] = m.id; mal.push(a); } }); });
    mal.sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
    I.metroMap = mmap;
    I.metroRe = new RegExp(B4 + '(' + mal.map(escRe).join('|') + ')' + AF, 'g');
    var stNames = dict(); Object.keys(TAX.us_states).forEach(function (k) { stNames[TAX.us_states[k]] = k; });
    I.stateByName = stNames;
    var snames = Object.keys(stNames).sort(function (a, b) { return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0); });
    I.stateNameRe = new RegExp(B4 + '(' + snames.map(escRe).join('|') + ')' + AF, 'g');
    IDX = I;
    return I;
  }

  /* ------------------------------------------------------ text segmenting */
  var H_PREF = /(nice to have|nice-to-have|preferred|bonus|pluses|plus points|a plus|desired|extra credit|good to have|would be great|ideally)/;
  var H_REQ = /(requirement|qualification|must have|must-have|what you'll need|what you need|what we're looking for|what we are looking for|who you are|you have|you bring|about you|skills|experience|minimum|basic qualifications|required|you might be a fit|you're a fit|is this you)/;
  var H_RESP = /(responsibilit|what you'll do|what you will do|the role|the job|day to day|day-to-day|your impact|in this role|duties|key tasks|you will|what you'll work on|the work)/;
  var H_BEN = /(benefit|perks|compensation|salary|pay range|what we offer|why join|why you'll love|^why [a-z0-9&.' -]{2,40}$|equal employment|total rewards|equal opportunity|eeo|accommodation|our offer|pay transparency)/;
  var H_ABOUT = /(about us|about the company|who we are|our mission|our story|company overview|about [a-z0-9&.' -]{2,40}$|the team|our team|life at)/;
  var H_LOGI = /(location|schedule|hours|work model|work arrangement|where you'll work|where you will work)/;
  var HEAD_LINE = /^(about (us|the (role|team|company|job|position|opportunity)|you|[a-z0-9&.' -]{2,40})|who we are|our (mission|story|team|values|culture|company)|the (role|team|opportunity|job|position)|company overview|role overview|position overview|overview|summary|job summary|position summary|job description|(key |primary |main |core )?(responsibilities|duties)( (&|and) (requirements|qualifications))?|what (you'll|you will) (do|be doing|work on|need)|what we're looking for|what we are looking for|what you (bring|need|have|'ll bring)|who you are|you (have|bring|are|might be a fit)|(minimum |basic |required |preferred |desired |additional |key )?(qualifications|requirements|skills|experience)( (&|and) (experience|skills|qualifications|requirements))?|(required|preferred|desired) skills( (&|and) experience)?|must[- ]haves?|nice[- ]to[- ]haves?|bonus( points)?|(preferred|required|desired|optional)|pluses|extra credit|(benefits|perks)( (&|and) (perks|benefits))?|compensation( (&|and) benefits)?|salary( range)?|pay( range| transparency)?|what we offer|why join( us)?|why you('ll| will) love [a-z0-9 ]+|total rewards|equal opportunity( employer)?|equal employment opportunity( employer| statement)?|eeo( statement)?|compensation (note|notes|details|information)|pay (note|details|information)|why [a-z0-9&.' -]{2,40}|location|work location|schedule|work model|work arrangement|our team|life at [a-z0-9&.' -]+|is this you\??|you might be a fit if)$/;
  var CUE_PREF = /(a plus|nice to have|nice-to-have|is a bonus|a bonus|bonus points|preferred|preferably|ideally|plus if|is helpful|helpful but not required|not required|desirable|would be a plus|is a plus|are a plus|good to have|we'd love|we would love|(?<![a-z])optional(?![a-z]))/;
  var CUE_REQ = /(required|must have|must be|you must|minimum of|at least|you'll need|you will need|requires|essential|mandatory|is a must|are a must)/;
  // A sentence carrying one of these is a requirement, never "about the company" -
  // even when it opens like company copy ("We are unable to sponsor...", "Python is a must").
  var REQ_SIGNAL = /(required|must have|must be|you must|is a must|are a must|minimum of|at least|you'll need|you will need|requires|essential|mandatory|\d+\s*\+?\s*((-|to)\s*\d+\s*)?(years|yrs|year)\s+(of\s+)?([a-z\/&-]+\s+){0,3}experience|sponsor|visa|citizen|clearance|authorized to work|eligible to work|work authorization)/;
  // The clause rules something OUT: "No Python needed", "you don't need a degree",
  // "This role does not require a clearance", "we don't use Java".
  var CUE_NEG = /((?<![a-z])(no|not|never|without)\s+(prior\s+|previous\s+|formal\s+|any\s+|professional\s+)?([a-z0-9+#.\/'& -]{1,40}?\s+)?(experience\s+|knowledge\s+|background\s+)?(is\s+|are\s+)?(needed|required|necessary|expected)(?![a-z])|(?<![a-z])(do|does|will)\s+not\s+(need|require)(?![a-z])|(?<![a-z])(don't|doesn't|won't)\s+(need|require)(?![a-z])|(?<![a-z])no need (to|for)(?![a-z])|(?<![a-z])not (a requirement|necessary|mandatory)(?![a-z])|(?<![a-z])we (do not|don't) use(?![a-z])|(?<![a-z])(will|does|do|can|may|shall|would)\s+not\s+(substitute|count|qualify|apply|be (considered|accepted|counted|substituted))(?![a-z])|(?<![a-z])(won't|doesn't|don't|can't|cannot)\s+(substitute|count|qualify|be (considered|accepted|counted|substituted))(?![a-z])|(?<![a-z])(is|are)\s+not\s+(accepted|considered|counted|a substitute|an acceptable substitute)(?![a-z])|(?<![a-z])not\s+(accepted|considered)\s+(in lieu|as a substitute)(?![a-z]))/;
  var ROLE_MENTION = /(?<![a-z])(you|your|candidate|candidates|role|position|responsibilit[a-z]*|looking for|seeking|hiring|join us|join our|this job|the job)(?![a-z])/;
  var COMPANY_OPEN = /^(we are|we're|founded|our mission|our team|at [a-z0-9&.' -]{2,40}, we|(?!(this|it|that|there|here|these|those|which) )[a-z0-9&.' -]{2,50} (is|are) (a|an|the|one of)(?![a-z]))/;
  var COMPANY_VERB = /^([a-z&.'-]+\s+){0,2}(is|are|builds|makes|creates|provides|offers|develops|runs|operates|delivers|helps|powers|owns|designs|sells|connects|enables|serves|manages|was founded)(?![a-z])/;
  var CLAUSE_ANCHOR = /(\d+\s*\+?\s*((-|to)\s*\d+\s*)?(years|yrs|year)|degree|bachelor|master|required|must|license|licensure|certification|certified)/;
  var LIST_CONJ = /(^|\s)(or|and|and\/or|nor|&)(\s|$)|\//;

  function headingSection(h) {
    var t = lc(h).replace(/[:\s]+$/, '').trim();
    if (H_PREF.test(t)) return 'pref';
    if (H_REQ.test(t)) return 'req';
    if (H_RESP.test(t)) return 'resp';
    if (H_BEN.test(t)) return 'benefits';
    if (H_ABOUT.test(t)) return 'about';
    if (H_LOGI.test(t)) return 'logistics';
    return null;
  }
  function isHeadingLine(h) { var t = lc(h).replace(/[:!.\s]+$/, '').replace(/\s+/g, ' ').trim(); return t.length > 1 && HEAD_LINE.test(t); }

  // the last comma before `end` that is not inside parentheses: "(RMA, Omega) is a plus" keeps its list together
  function lastTopComma(p, end) {
    var depth = 0, last = -1;
    for (var k = 0; k < end; k++) { var ch = p.charAt(k); if (ch === '(') depth++; else if (ch === ')') { if (depth > 0) depth--; } else if (ch === ',' && depth === 0) last = k; }
    return last;
  }
  function splitClauses(s) {
    // A "nice to have" at the end of a sentence covers only its own clause:
    // "SQL required (Python preferred)", "Strong SQL and Excel skills, Python a plus",
    // "..., 1+ year of acute care, telemetry experience preferred". A plain list that
    // ends in "preferred" ("Python, R or SQL preferred") stays one clause.
    var parts = s.split(/;\s+/), out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], pn = /\(([^()]{3,160})\)/.exec(p);
      if (pn && CUE_NEG.test(lc(pn[1])) && p.slice(0, pn.index).trim().length > 1) { out.push((p.slice(0, pn.index) + p.slice(pn.index + pn[0].length)).replace(/\s+/g, ' ').trim()); out.push(pn[1].trim()); continue; }
      var low = lc(p), cm = CUE_PREF.exec(low);
      if (cm && cm.index > 0) {
        var open = p.lastIndexOf('(', cm.index - 1);
        if (open > 0) {
          var close = p.indexOf(')', open);
          // "(Python preferred)" is its own clause; "Python (preferred)" is not
          if ((close === -1 || close > cm.index) && p.slice(0, open).trim().length > 1 && p.slice(open + 1, cm.index).trim().length > 0) { out.push(p.slice(0, open).trim()); out.push(p.slice(open + 1).trim()); continue; }
        }
        var lastComma = lastTopComma(p, cm.index);
        if (lastComma > 0) {
          var left = p.slice(0, lastComma), right = p.slice(lastComma + 1);
          var rightHead = lc(p.slice(lastComma + 1, cm.index));
          var listy = p.split(',').every(function (it) { return it.trim().split(/\s+/).length <= 3; });
          if (CLAUSE_ANCHOR.test(lc(left)) || (!listy && !LIST_CONJ.test(rightHead))) { out.push(left.trim()); out.push(right.trim()); continue; }
        }
      }
      out.push(p.trim());
    }
    return out.filter(function (x) { return x.length > 0; });
  }
  // what the employer offers toward a credential ("we pay for the CPA review course") is a benefit, not a bar
  var SUPPORT_CUE = /(?<![a-z])((we|we'll|we will|the company will|our team will)\s+(actively\s+|fully\s+)?(support|supports|pay for|pays for|cover|covers|reimburse|reimburses|sponsor|sponsors|encourage|encourages|fund|funds)\s+([a-z0-9'&+-]+\s+){0,5}?(licensure|license|licenses|certification|certifications|exams?|review courses?|study|tuition|credentials?|candidates)|paid study (leave|time)|exam fees|licensure support|support (for|toward|towards) (your )?(licensure|certification|license))(?![a-z])/;
  var ABBR_END = /(?<![A-Za-z])(St|Mt|Ft|Dr|Mr|Mrs|Ms|Jr|Sr|vs|Ave|Blvd|Rd|Dept|approx|e\.g|i\.e|Lt|Col|Sgt|Capt|Gen|Gov)\.$/;
  function sentPieces(line) {
    var out = [];
    line.split(/(?<=[.!?])\s+(?=[A-Z0-9("])/).forEach(function (p) { if (out.length && ABBR_END.test(out[out.length - 1])) out[out.length - 1] += ' ' + p; else out.push(p); });
    return out;
  }
  function segments(desc, org) {
    var text = normText(desc);
    var lines = text.split(/\n+/);
    var out = [], section = 'none';
    var orgName = normOrg(org || ''), orgFirst = orgName.split(' ')[0] || '';
    if (orgFirst.length < 5) orgFirst = '';
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li].replace(/^[\s•*\->]+/, '').replace(/^\(?\d{1,2}[.)]\s+/, '').trim();
      if (!line) continue;
      var words = line.split(/\s+/).length;
      var colon = line.indexOf(':'), lineSec = null;
      if (colon > 0 && colon < 70 && isHeadingLine(line.slice(0, colon))) {
        var head = line.slice(0, colon), rest = line.slice(colon + 1).trim();
        var hs = headingSection(head);
        if (hs) {
          if (rest.length < 2) { section = hs; continue; }
          // "About Acme: we build payroll software." describes the company on this
          // line only - it never swallows the requirements that follow it
          if (hs === 'about') lineSec = 'about'; else section = hs;
          line = rest;
        }
      } else if (words <= 8 && isHeadingLine(line)) {
        var hs2 = headingSection(line);
        if (hs2) { section = hs2; continue; }
      }
      var sents = sentPieces(line);
      for (var si = 0; si < sents.length; si++) {
        var sent = sents[si].trim();
        if (!sent) continue;
        var hm = sent.match(/^([A-Za-z' &\/-]{3,40}):\s+(\S[\s\S]*)$/), sentSec = lineSec;
        if (hm && isHeadingLine(hm[1])) { var hs3 = headingSection(hm[1]); if (hs3) { if (hs3 === 'about') sentSec = 'about'; else section = hs3; sent = hm[2]; } }
        var pieces = splitClauses(sent);
        for (var pi2 = 0; pi2 < pieces.length; pi2++) {
          var s = pieces[pi2], low = lc(s);
          var cue = CUE_PREF.test(low) ? 'pref' : (CUE_NEG.test(low) ? 'neg' : (CUE_REQ.test(low) ? 'req' : null));
          var sec = sentSec || section;
          if (cue !== 'req' && SUPPORT_CUE.test(low)) sec = 'benefits';
          if (sec === 'none' && !ROLE_MENTION.test(low)) {
            var pre = orgName && low.indexOf(orgName) === 0 ? orgName : (orgFirst && low.indexOf(orgFirst) === 0 ? orgFirst : '');
            var startsOrg = !!pre && COMPANY_VERB.test(low.slice(pre.length).replace(/^[\s.,&'-]+/, ''));
            if (COMPANY_OPEN.test(low) || startsOrg) sec = 'about';
          }
          if (sec === 'about' && (REQ_SIGNAL.test(low) || CUE_PREF.test(low))) sec = 'none';
          out.push({ text: s, low: low, section: sec, cue: cue });
        }
      }
    }
    return out;
  }
  function segImportance(seg) {
    // 'req!' = explicitly required (requirements section or "must"/"required"),
    // 'pref' = explicitly nice-to-have, 'req' = implied by being part of the job.
    if (seg.section === 'about' || seg.section === 'benefits' || seg.section === 'logistics') return null;
    if (seg.cue === 'neg') return null;
    if (seg.cue === 'pref') return 'pref';
    if (seg.cue === 'req') return 'req!';
    if (seg.section === 'pref') return 'pref';
    if (seg.section === 'req') return 'req!';
    return 'req';
  }

  /* -------------------------------------------------------- skill finding */
  // a hit that sits inside one of the skill's "not" phrases is a different thing
  // ("prospective audit and feedback" is antimicrobial stewardship, not an audit)
  function insideNot(low, hit, nots) {
    if (!nots || !nots.length) return false;
    for (var q = 0; q < nots.length; q++) {
      var p = nots[q], k = low.indexOf(p, Math.max(0, hit.end - p.length));
      while (k !== -1 && k <= hit.at) { if (k + p.length >= hit.end) return true; k = low.indexOf(p, k + 1); }
    }
    return false;
  }
  var BAR_RE = /(?<![a-z])(admission to|admitted to|admitted in|member of|membership in|good standing (?:with|of|in)|licensed in)( the)? (state of )?[a-z][a-z.]*( [a-z][a-z.]*){0,2} bar(?![a-z])/g;
  // a shared word in a pair: "vendor and SOW management" names vendor management, "accounts payable and
  // receivable" names accounts receivable, "unit and integration testing" names unit testing
  var COORD_TOK = /[a-z0-9][a-z0-9+#-]*|&|\//g, COORD_CONJ = ['and', 'or', '&', '/'];
  function coordHits(low, hits) {
    if (!/\s(and|or)\s|&|\//.test(low)) return;
    var I = idx(), t = [], m;
    COORD_TOK.lastIndex = 0;
    while ((m = COORD_TOK.exec(low)) !== null) t.push({ w: m[0], s: m.index, e: m.index + m[0].length });
    var tight = function (a, b) { return /^\s*$/.test(low.slice(t[a].e, t[b].s)); };
    for (var i = 0; i + 3 < t.length; i++) {
      if (!(tight(i, i + 1) && tight(i + 1, i + 2) && tight(i + 2, i + 3))) continue;
      var cand = null;
      var cj = function (k) { return COORD_CONJ.indexOf(t[i + k].w) !== -1; };
      if (cj(1) && !cj(0) && !cj(2) && !cj(3)) cand = t[i].w + ' ' + t[i + 3].w;          // right-shared: A and B C -> A C
      else if (cj(2) && !cj(0) && !cj(1) && !cj(3)) cand = t[i].w + ' ' + t[i + 3].w;     // left-shared: A B and C -> A C
      if (!cand) continue;
      var id = own(I.aliasMap, cand);
      if (!id) continue;
      var hit = { id: id, at: t[i].s, end: t[i + 3].e };
      if (!insideNot(low, hit, I.skill[id].not)) hits.push(hit);
    }
  }
  function findSkills(original) {
    // returns [{id, at}] in order of appearance, for one sentence / short text
    var I = idx();
    original = str(original);
    var low = lc(original), hits = [], m;
    I.aliasRe.lastIndex = 0;
    while ((m = I.aliasRe.exec(low)) !== null) {
      var hit = { id: I.aliasMap[m[1]], at: m.index, end: m.index + m[1].length };
      if (!insideNot(low, hit, I.skill[hit.id].not)) hits.push(hit);
    }
    // "admission to the Illinois bar", "member in good standing of the New York State bar"
    BAR_RE.lastIndex = 0;
    while ((m = BAR_RE.exec(low)) !== null) { if (I.skill.bar_admission) hits.push({ id: 'bar_admission', at: m.index, end: m.index + m[0].length }); }
    coordHits(low, hits);
    I.csRe.lastIndex = 0;
    while ((m = I.csRe.exec(original)) !== null) {
      var sids = [I.csMap[m[1]]].concat(I.csAlt[m[1]] || []);
      for (var si = 0; si < sids.length; si++) {
        var sid = sids[si], sk = I.skill[sid];
        if (sk.ctx && sk.ctx.length) {
          var ok = false;
          for (var c = 0; c < sk.ctx.length; c++) { if (hasWord(low, sk.ctx[c])) { ok = true; break; } }
          if (!ok && sk.pre && sk.pre.length) {
            var before = low.slice(Math.max(0, m.index - 25), m.index);
            for (var pi = 0; pi < sk.pre.length; pi++) { if (new RegExp('(?<![a-z0-9])' + escRe(sk.pre[pi]) + '\\s*[,/]?\\s*$').test(before)) { ok = true; break; } }
          }
          if (!ok) continue;
        }
        if (sk.neg && sk.neg.length) {
          var after = low.slice(m.index + m[1].length);
          var negHit = false;
          for (var n = 0; n < sk.neg.length; n++) { if (new RegExp('^[\\s-]+' + escRe(sk.neg[n]) + '(?![a-z0-9])').test(after)) { negHit = true; break; } }
          if (negHit) continue;
        }
        hits.push({ id: sid, at: m.index, end: m.index + m[1].length });
        break;
      }
    }
    hits.sort(function (a, b) { return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    return hits;
  }

  /* -------------------------------------------------- listing normalizing */
  function toCount(v, dflt) {
    if (v == null || v === '' || typeof v === 'boolean') return dflt;
    var n = Number(v);
    return isNum(n) && n >= 0 ? Math.floor(n) : dflt;
  }
  function normPeriod(p) {
    var t = lc(p).trim();
    if (!t) return null;
    if (/^(hour|hourly|hr|per hour|an hour)$/.test(t)) return 'hour';
    if (/^(year|yearly|annual|annually|annum|per year|yr|a year)$/.test(t)) return 'year';
    if (/^(month|monthly|per month|mo)$/.test(t)) return 'month';
    if (/^(week|weekly|per week|wk)$/.test(t)) return 'week';
    if (/^(day|daily|per day)$/.test(t)) return 'day';
    return 'unknown';
  }
  function normalizeListing(l) {
    l = l || {};
    var smin = l.salary_min != null ? l.salary_min : l.salaryMin;
    var smax = l.salary_max != null ? l.salary_max : l.salaryMax;
    var period = normPeriod(l.salary_period || l.salaryPeriod || null);
    smin = smin == null || smin === '' || typeof smin === 'boolean' ? null : Number(smin); if (!isNum(smin) || smin <= 0) smin = null;
    smax = smax == null || smax === '' || typeof smax === 'boolean' ? null : Number(smax); if (!isNum(smax) || smax <= 0) smax = null;
    if (smin != null || smax != null) {
      var ref = smax != null ? smax : smin;
      if (period === 'unknown') period = ref >= 1000 ? 'year' : null;
      else if (!period) {
        // no unit given: big numbers are annual; an intern's "25" is hourly; anything
        // else under 1,000 could be hourly or thousands - we don't guess a pay figure
        var isIntern = lc(l.type) === 'internship' || /(?<![a-z0-9_])intern/.test(lc(l.title));
        period = ref >= 1000 ? 'year' : (isIntern && ref < 100 ? 'hour' : null);
      }
      if (!period) { smin = null; smax = null; }
    }
    var pred = l.salary_is_predicted != null ? l.salary_is_predicted : l.salaryIsPredicted;
    var tags = Array.isArray(l.tags) ? l.tags.map(function (t) { return str(t); }) : [];
    return {
      id: str(l.id),
      title: str(l.title).trim(),
      org: str(l.org || l.company).trim(),
      type: lc(l.type) || 'job',
      location: str(l.location != null ? l.location : l.loc).trim(),
      description: str(l.description),
      tags: tags,
      salaryMin: smin, salaryMax: smax, salaryPeriod: period,
      salaryPredicted: pred == null ? null : !!pred,
      deadline: l.deadline || null,
      postedAt: parseTime(l.posted_at != null ? l.posted_at : l.postedAt),
      firstSeenAt: parseTime(l.first_seen_at != null ? l.first_seen_at : (l.firstSeenAt != null ? l.firstSeenAt : (l.fetched_at != null ? l.fetched_at : l.fetchedAt))),
      lastSeenAt: parseTime(l.last_seen_at != null ? l.last_seen_at : l.lastSeenAt),
      seenCount: toCount(l.seen_count != null ? l.seen_count : l.seenCount, null),
      repostCount: toCount(l.repost_count != null ? l.repost_count : l.repostCount, 0),
      employmentType: lc(l.employment_type || l.employmentType) || null,
      contractType: lc(l.contract_type || l.contractType) || null,
      applyUrl: str(l.apply_url || l.applyUrl),
      source: str(l.source),
    };
  }

  /* ------------------------------------------------------------- parsers */
  var WORDNUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15 };
  var WORDNUM_PAREN = /(?<![a-z])(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen)\s*\((\d{1,2})\)/g;
  var WORDNUM_RE = /(?<![a-z])(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen)(?![a-z])(?=[^.]{0,16}(?<![a-z])(years|yrs|year)(?![a-z]))/g;
  var YRS_RE = /(?:(minimum|at least|min\.)\s*(?:of\s*)?)?(\d{1,2})(?:\s*(?:-|to)\s*(\d{1,2}))?\s*(\+|plus|or more)?\s*(years|yrs|year|yr)(?![a-z])/g;
  var YRS_TAIL_SKIP = /^\s*(old|of age|or older|or over|and older|and over|degree|college|program|ago|in a row|running|warranty|term|of service|of school|of high school|of university|of undergraduate|of coursework|of study|of college|cliff|vesting|with a one-year cliff)/;
  // not a minimum: a ceiling ("up to 2 years", "no more than 3"), or not about you at all
  // ("vests over 4 years", "in your first 2 years", "every 3 years", "average tenure is 7 years")
  var YRS_HEAD_SKIP = /((within|over the (past|last)|for over|for more than|for nearly|for almost|in the last|in the past|founded|established|nearly|almost|up to|no more than|not more than|less than|fewer than|under|at most|maximum of|max\.?|a maximum of|vests? over|vesting over|paid out over|spread over|every|each|first|initial|in your|within your|for the next|for the first|tenure is|tenure of|average tenure|averaging|in business for|operating for|been around for|serving for|for the past|for the last)\s*$)|(\d\s*-\s*$)/;
  var YRS_EXP = /(experience|exp(?![a-z])|professional|industry|hands-on|track record|background|working|work in|work with|in a similar|in an? [a-z]+ (role|position|environment|setting)|building|managing|leading|developing|using|supporting|with |as an? |of [a-z][a-z-]* |in [a-z]+)/;

  // "10+ years (8+ with a Master's)": a shorter bar for people with a degree
  var YRS_DEG_ALT = /(?<![0-9])(\d{1,2})\s*\+?\s*(?:years?|yrs?)?\s*(?:of\s+[a-z-]+\s+)?(?:experience\s+)?(?:with|w\/|given|if you have|for candidates with|for those with)\s+(?:a\s+|an\s+)?(?:relevant\s+)?(master'?s|masters|m\.s\.|mba|ph\.?d\.?|doctorate|graduate degree|advanced degree|bachelor'?s|bachelors|b\.s\.|b\.a\.)(?![a-z])/;
  function degLevel(w) { return /^(ph|doctorate)/.test(w) ? 4 : (/^(master|m\.s|mba|graduate|advanced)/.test(w) ? 3 : 2); }
  function parseYears(segs) {
    var best = null, bestT = '';
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i], segTxt = null;
      if (seg.section === 'about' || seg.section === 'benefits' || seg.cue === 'neg') continue;
      var imp = segImportance(seg);
      var t = seg.low.replace(WORDNUM_PAREN, '$2').replace(WORDNUM_RE, function (w) { return String(WORDNUM[w]); });
      var m; YRS_RE.lastIndex = 0;
      while ((m = YRS_RE.exec(t)) !== null) {
        var n1 = parseInt(m[2], 10), n2 = m[3] != null ? parseInt(m[3], 10) : null;
        var unit = m[5], end = m.index + m[0].length;
        var tail = t.slice(end, end + 60), head = t.slice(Math.max(0, m.index - 25), m.index);
        if (YRS_TAIL_SKIP.test(tail)) continue;
        if (YRS_HEAD_SKIP.test(head)) continue;
        if (/^\s*-\s*(year|yr)/.test(t.slice(m.index + String(n1).length))) continue;
        if ((unit === 'year' || unit === 'yr') && n1 > 1 && !/^\s*(of\s+)?([a-z-]+\s+){0,3}experience/.test(tail)) continue;
        var strongForm = (unit === 'years' || unit === 'yrs') && (m[4] != null || n2 != null || m[1] != null);
        if (!strongForm && !YRS_EXP.test(tail) && seg.low.indexOf('experience') === -1) continue;
        if (n1 > 20 || (n2 != null && (n2 > 25 || n2 < n1))) continue;
        var cand = { min: n1, max: n2, text: segTxt || (segTxt = trunc(seg.text, 140)), pref: imp === 'pref' };
        if (!best || (cand.pref === best.pref ? cand.min > best.min : !cand.pref)) { best = cand; bestT = t; }
      }
    }
    if (best) { var am = YRS_DEG_ALT.exec(bestT); if (am && parseInt(am[1], 10) < best.min) best.alt = { min: parseInt(am[1], 10), edu: degLevel(am[2]) }; }
    return best;
  }

  var LV_INTERN = /(?<![a-z])(intern|internship|co-op|coop|summer analyst|summer associate|apprenticeship)(?![a-z])/;
  var LV_EXEC = /(?<![a-z])(vp|vice president|chief|cxo|ceo|cto|cfo|coo|cmo|svp|evp|president)(?![a-z])/;
  var LV_DIR = /(?<![a-z])(director|head of)(?![a-z])/;
  var LV_LEAD = /(?<![a-z])(staff (software |data |machine learning |ml |product |research |security |site reliability |frontend |front-end |backend |back-end |full[- ]stack |platform |infrastructure |applied |ux |mobile )(engineer|scientist|designer|developer|architect)|staff (designer|developer|architect)|principal|(?<!asbestos and )(?<!asbestos & )(?<!asbestos, )lead(?!\s*(gen|generation))(?![- ](based|abatement|paint|poisoning|inspector|inspection|hazard|safe|pipe|pipes|service line|exposure|testing|risk|and copper|and asbestos|& asbestos))|distinguished|architect)(?![a-z])/;
  // outside tech a "lead" is one step above staff (a lead RT, a lead teacher), not a staff/principal engineer
  var LV_LEAD_STRONG = /(?<![a-z])(staff (software |data |machine learning |ml |product |research |security |site reliability |frontend |front-end |backend |back-end |full[- ]stack |platform |infrastructure |applied |ux |mobile )(engineer|scientist|designer|developer|architect)|staff (designer|developer|architect)|principal|distinguished|architect)(?![a-z])/;
  var LV_TECH = /(?<![a-z])(engineer|engineering|developer|software|data|scientist|designer|design|product|platform|infrastructure|security|devops|sre|qa|ux|ui|analytics|machine learning|ml|ai|technical|tech)(?![a-z])/;
  var LV_MGR = /((?<![a-z])(engineering|people|team|general|district|regional|design|data science|analytics)\s+manager(?![a-z]))|^(senior\s+)?manager(,|\s+of|\s*$)|(?<![a-z])manager of(?![a-z])/;
  var LV_SENIOR = /(?<![a-z])(senior|sr\.?|iii|level 3|l3)(?![a-z])/;
  var LV_MID = /(?<![a-z])(ii|mid-level|mid level|intermediate|level 2)(?![a-z])/;
  var LV_ENTRY = /(?<![a-z])(junior|jr\.?|entry-level|entry level|new grad|new graduate|graduate|early career|early-career|associate|apprentice|trainee|i)(?![a-z])/;
  // titles whose level words mislead: "Executive Assistant to the CEO" is not an executive,
  // "Shift Lead" is not a Lead/Staff engineer, "Associate Professor" is not entry level
  var LV_ASSIST = /(?<![a-z])(executive assistant|assistant to|administrative assistant|personal assistant|office assistant|business partner to|executive business partner|administrative business partner)(?![a-z])/;
  // who a role supports ("to the CEO", "Office of the President") is not the role's own level
  var LV_SUPPORTS = /(?<![a-z])(to the|office of the)\s+(ceo|cfo|coo|cto|cmo|president|founders?|chief [a-z]+ officer)(?![a-z])/g;
  var LV_FRONTLINE = /(?<![a-z])((shift|crew|floor|line|cashier|store|retail|warehouse|kitchen|front desk|sales floor) (lead|leader|supervisor)|lead (cashier|server|host|hostess|teller|associate|barista|cook|clerk|bartender))(?![a-z])/;
  var LV_ASSOC_SENIOR = /(?<![a-z])associate (general counsel|professor|dean|partner|principal)(?![a-z])/;
  var LV_LADDER = /(?<![a-z])(sdr|bdr|sales development (rep|representative)|business development (rep|representative)|customer service (rep|representative|agent)|call center (rep|representative|agent))(?![a-z])/;
  function titleLevel(title) {
    var t = lc(title);
    if (!t) return null;
    if (LV_INTERN.test(t)) return 0;
    // an entry ladder's own seniority ("Senior SDR") stays in the early-career band
    if (LV_LADDER.test(t) && !LV_MGR.test(t) && !LV_DIR.test(t) && !LV_EXEC.test(t) && !/(?<![a-z])manager(?![a-z])/.test(t)) return (LV_SENIOR.test(t) || LV_LEAD.test(t)) ? 2 : 1.5;
    if (/(?<![a-z])chief of staff(?![a-z])/.test(t)) return 4;
    if (LV_ASSIST.test(t)) return LV_SENIOR.test(t) ? 3 : (/(?<![a-z])(executive assistant|executive business partner|business partner to)(?![a-z])/.test(t) ? 2 : 1);
    t = t.replace(LV_SUPPORTS, ' ');
    if (/(?<![a-z])(associate vice president|avp)(?![a-z])/.test(t)) return 5;
    if (/(?<![a-z])associate director(?![a-z])/.test(t)) return 4;
    if (LV_ASSOC_SENIOR.test(t)) return 3;
    if (LV_FRONTLINE.test(t)) return 1.5;
    if (LV_EXEC.test(t)) return 6;
    if (LV_DIR.test(t)) return 5;
    if (LV_LEAD.test(t)) return (!LV_LEAD_STRONG.test(t) && !LV_TECH.test(t)) ? 3 : 4;
    if (LV_MGR.test(t)) return 4;
    if (LV_SENIOR.test(t)) return 3;
    if (LV_MID.test(t)) return 2;
    if (LV_ENTRY.test(t)) return 1;
    return null;
  }
  function levelFromYears(y) {
    // years alone never make you a director - that's a title, not a tenure
    if (y == null) return null;
    if (y < 1) return 1; if (y < 3) return 1.5; if (y < 5) return 2; if (y < 8) return 3; return 4;
  }
  var LEVEL_LABELS = [[0, 'Internship'], [1, 'Entry level'], [1.5, 'Early career'], [2, 'Mid level'], [3, 'Senior'], [4, 'Lead / Staff'], [5, 'Director'], [6, 'Executive']];
  function levelLabel(l) { if (l == null) return 'Not stated'; var best = LEVEL_LABELS[0]; for (var i = 0; i < LEVEL_LABELS.length; i++) { if (l >= LEVEL_LABELS[i][0]) best = LEVEL_LABELS[i]; } return best[1]; }
  function levelBucket(l) { if (l == null) return null; if (l < 0.5) return 'intern'; if (l < 1.75) return 'entry'; if (l < 2.5) return 'mid'; if (l < 3.5) return 'senior'; if (l < 4.5) return 'lead'; if (l < 5.5) return 'director'; return 'exec'; }

  var EDU = [
    [4, /(?<![a-z])(ph\.?d|doctorate|doctoral|doctor of)(?![a-z])/],
    [3, /(?<![a-z])(?<!scrum )(master's|masters (degree|in|of|program)|master of|ms degree|ms in|m\.s\.|mba|graduate degree|advanced degree|m\.a\.|mph|msc|m\.sc|msn|msw|mfa|m\.f\.a\.|meng|m\.eng|m\.ed\.)(?![a-z])/],
    [2, /(?<![a-z])(bachelor's|bachelors|bachelor of|ba\/bs|bs\/ba|b\.s\.|b\.a\.|bs degree|ba degree|bs in|ba in|undergraduate degree|bsn|bsc|b\.sc|bfa|b\.f\.a\.|bba|beng|b\.eng)(?![a-z])/],
    [1, /(?<![a-z])(associate's degree|associate degree|associates degree|2-year degree|two-year degree)(?![a-z])/],
    [0, /(?<![a-z])(high school diploma|ged|high school or equivalent|high school degree)(?![a-z])/],
  ];
  // "a degree in X" / "a college degree" name no level; read as a bachelor's only when nothing more specific is said
  var EDU_GENERIC = /(?<![a-z])(4-year degree|four-year degree|college degree|university degree|degree in)(?![a-z])/;
  var EDU_EQUIV = /(or equivalent|equivalent (practical |work |professional |combination of education and )?experience|or relevant experience|in lieu of a degree|degree not required|no degree required)/;
  function parseEducation(segs) {
    var req = null, equiv = false, text = '';
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var imp = segImportance(seg);
      if (!imp) continue;
      if (EDU_EQUIV.test(seg.low)) equiv = true;
      if (imp === 'pref') continue;
      var lvls = [];
      for (var e = 0; e < EDU.length; e++) { if (EDU[e][1].test(seg.low)) lvls.push(EDU[e][0]); }
      if (!lvls.length && EDU_GENERIC.test(seg.low)) lvls.push(2);
      if (!lvls.length) continue;
      var mn = Math.min.apply(null, lvls);
      if (req == null || mn > req) { req = mn; text = trunc(seg.text, 140); }
    }
    return { level: req, equivalentOk: equiv, text: text };
  }

  var MODE_REMOTE_LOC = /(?<![a-z])(remote|work from home|wfh|anywhere)(?![a-z])/;
  var MODE_HYBRID_LOC = /(?<![a-z])hybrid(?![a-z])/;
  var MODE_ONSITE_LOC = /(?<![a-z])(on-site|onsite|in-office|in office|in-person|in person)(?![a-z])/;
  var MODE_HYBRID_DESC = /((?<![a-z])hybrid(?![a-z])|(?<![0-9])[1-4]\s*days?\s*(a|per)\s*week\s*(in|at)\s*(the\s*|our\s*)?office|(?<![a-z])in[- ]office\s*[1-4]\s*days|(?<![0-9])[1-4]\s*days?\s*(in[- ]office|on-?site))/;
  var MODE_REMOTE_DESC = /((?<![a-z])(fully remote|100% remote|remote-first|remote first|work from home|work from anywhere|remote position|remote role|this role is remote|this is a remote|remote within|remote in the|remote-friendly|remote opportunity|remote job|work remotely|working remotely|distributed team|distributed company)(?![a-z]))/;
  var MODE_ONSITE_DESC = /((?<![a-z])(on-?site|in-person|in person|office-based|report to (our|the) office|this role is based in|must be able to commute|relocation required|must relocate|work in our office|in the office (five|5) days|5 days a week in (the|our) office|office (five|5) days (a|per) week|(five|5) days (a|per) week (on-?site|in-?office|in the office|in our office)|fully in-office|fully onsite)(?![a-z]))/;
  var REGION_RE = /remote\s*[-(,:]?\s*(\(?\s*)(us|usa|u\.s\.|united states|us only|canada|uk|emea|europe|eu|latam|apac|india)(?![a-z])|(us|u\.s\.)[- ]based remote|remote within the (us|united states|u\.s\.)|must (be located|reside|live) in the (us|united states|u\.s\.)|(open to|available to) (candidates|applicants) (in|located in) the (us|united states)/;
  function regionCode(s) {
    s = lc(s);
    if (/(us|usa|u\.s\.|united states)/.test(s)) return 'US';
    if (/canada/.test(s)) return 'CA'; if (/uk/.test(s)) return 'UK'; if (/(emea|europe|eu)/.test(s)) return 'EU';
    if (/latam/.test(s)) return 'LATAM'; if (/apac/.test(s)) return 'APAC'; if (/india/.test(s)) return 'IN';
    return null;
  }

  function parsePlaces(locRaw) {
    var I = idx();
    var s = lc(locRaw);
    var parts = s.split(/;|\||\s+or\s+|\s+and\s+|\s*\/\s*/);
    var places = [];
    for (var p = 0; p < parts.length; p++) {
      var clean = function (x) { return x.replace(MODE_REMOTE_LOC, ' ').replace(MODE_HYBRID_LOC, ' ').replace(MODE_ONSITE_LOC, ' ').replace(/[()\[\]]/g, ' ').replace(/(?<![0-9])\d{5}(?:-\d{4})?(?![0-9])/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[-,:\s]+|[-,:\s]+$/g, ''); };
      var part = clean(parts[p]), bare = clean(parts[p].replace(/\([^()]*\)|\[[^\[\]]*\]/g, ' '));
      if (!part) continue;
      var cityRe = /^([a-z .'-]+?),\s*([a-z]{2})(?:\s*,\s*(us|usa|united states))?$/;
      var cm = (bare && bare.match(cityRe)) || part.match(cityRe);
      if (cm && bare && bare.match(cityRe)) part = bare;
      if (cm) {
        var city = cm[1].trim(), st = cm[2].toUpperCase();
        var mid = own(I.metroMap, city + ', ' + cm[2]) || null;
        if (mid && I.metro[mid].states.indexOf(st) === -1) mid = null;
        if (!mid) { mid = own(I.metroMap, city) || null; if (mid && I.metro[mid].states.indexOf(st) === -1) mid = null; }
        places.push({ metro: mid, state: TAX.us_states[st] ? st : null, label: part });
        continue;
      }
      var m, found = null; I.metroRe.lastIndex = 0;
      while ((m = I.metroRe.exec(part)) !== null) { found = I.metroMap[m[1]]; break; }
      if (found) { places.push({ metro: found, state: I.metro[found].states[0], label: part }); continue; }
      I.stateNameRe.lastIndex = 0; var sm = I.stateNameRe.exec(part);
      if (sm) { places.push({ metro: null, state: I.stateByName[sm[1]], label: part }); continue; }
      var code = part.match(/(?<![a-z])([a-z]{2})$/);
      if (code && TAX.us_states[code[1].toUpperCase()] && part.length <= 3) { places.push({ metro: null, state: code[1].toUpperCase(), label: part }); continue; }
      if (/^(us|usa|united states|u\.s\.|nationwide|national|multiple locations|various|online)$/.test(part)) continue;
      places.push({ metro: null, state: null, label: part });
    }
    return places;
  }

  function parseMode(locRaw, segs) {
    var loc = lc(locRaw);
    var mode = null, src = null, region = null;
    var descAll = segs.map(function (g) { return g.low; }).join(' \n ');
    var lr = MODE_REMOTE_LOC.test(loc), lh = MODE_HYBRID_LOC.test(loc), lo = MODE_ONSITE_LOC.test(loc);
    var dh = MODE_HYBRID_DESC.test(descAll), dr = MODE_REMOTE_DESC.test(descAll), dO = MODE_ONSITE_DESC.test(descAll);
    if (lh) { mode = 'hybrid'; src = 'location'; }
    else if (lr) { mode = dh ? 'hybrid' : 'remote'; src = dh ? 'description' : 'location'; }
    else if (lo) { mode = dh ? 'hybrid' : 'onsite'; src = dh ? 'description' : 'location'; }
    else if (dh) { mode = 'hybrid'; src = 'description'; }
    else if (dr) { mode = 'remote'; src = 'description'; }
    else if (dO) { mode = 'onsite'; src = 'description'; }
    var rm = REGION_RE.exec(loc + ' \n ' + descAll);
    if (rm && (mode === 'remote' || mode === null)) region = regionCode(rm[0]);
    return { mode: mode, source: src, region: region };
  }

  var ET_TITLE = [
    ['internship', /(?<![a-z])(intern|internship|co-op|coop)(?![a-z])/],
    ['contract', /(?<![a-z])(contract|contractor|freelance|1099|c2c|contract-to-hire)(?![a-z])/],
    ['temporary', /(?<![a-z])(temp|temporary|seasonal)(?![a-z])/],
    ['part_time', /(?<![a-z])part[- ]time(?![a-z])/],
  ];
  var ET_DESC_CONTRACT = /(?<![a-z])(\d{1,2}[- ]month contract|contract role|contract position|contract-to-hire|contract to hire|w2 contract|1099|c2c|corp to corp|fixed[- ]term|contract assignment|temp-to-hire|temp to hire|duration of the contract)(?![a-z])/;
  var ET_DESC_PART = /(?<![a-z])(part[- ]time)(?![a-z])/;
  var ET_DESC_FULL = /(?<![a-z])(full[- ]time)(?![a-z])/;
  var ET_DESC_TEMP = /(?<![a-z])(temporary position|temporary role|seasonal position|seasonal role)(?![a-z])/;
  function parseEmploymentType(n, segs) {
    var f = n.employmentType;
    if (f === 'full_time' || f === 'part_time' || f === 'contract' || f === 'internship' || f === 'temporary') {
      if (f === 'full_time' && n.contractType === 'contract') return { type: 'contract', source: 'listing' };
      return { type: f, source: 'listing' };
    }
    if (n.contractType === 'contract') return { type: 'contract', source: 'listing' };
    var t = lc(n.title);
    for (var i = 0; i < ET_TITLE.length; i++) { if (ET_TITLE[i][1].test(t)) return { type: ET_TITLE[i][0], source: 'title' }; }
    if (n.type === 'internship') return { type: 'internship', source: 'listing' };
    var d = segs.filter(function (g) { return g.section !== 'about'; }).map(function (g) { return g.low; }).join(' \n ');
    if (ET_DESC_CONTRACT.test(d)) return { type: 'contract', source: 'description' };
    if (ET_DESC_TEMP.test(d)) return { type: 'temporary', source: 'description' };
    if (ET_DESC_PART.test(d) && !ET_DESC_FULL.test(d)) return { type: 'part_time', source: 'description' };
    if (ET_DESC_FULL.test(d)) return { type: 'full_time', source: 'description' };
    if (n.contractType === 'permanent') return { type: 'full_time', source: 'listing' };
    return { type: null, source: null };
  }

  var AUTH_NOSPON = /((not|unable to|cannot|can't|won't|will not|do not|does not|don't|doesn't|are unable to|is unable to|no longer)\s+(currently\s+)?(be\s+)?(able to\s+)?(offer|provide|support|sponsor|consider|accommodate)(ing)?\s+(any\s+)?(employment\s+|immigration\s+)?(visa\s+|h-?1b\s+|work\s+)?(sponsor|sponsorship|visa)|sponsorship (is )?not (available|offered|provided|possible)|no (visa |h-?1b |immigration |employment )?sponsorship|without (the need for |requiring |needing )?(current or future |now or in the future |present or future )?(employer |visa |company |employment |immigration )?sponsorship|not eligible for (visa |immigration |employment |h-?1b )?sponsorship|sponsorship will not be|(does not|will not|cannot|can't|won't|unable to|not able to|do not|don't) sponsor(?![a-z])|now or in the future require sponsorship|not open to (visa |h-?1b |immigration )?sponsor|(cannot|can't|unable to|will not|won't|do not|don't|are not able to|is not able to) (consider|accept|hire|interview|employ) [a-z ,]{0,40}(require|need)[a-z ]{0,30}(sponsorship|visa)|(authorized|eligible) to work in the (u\.?s\.?|united states) (on a permanent basis|permanently))/;
  var AUTH_SPONS = /(visa sponsorship (is )?available|(will|we|can|able to|happy to|willing to) sponsor (h-?1b|visas?|work visas?|employment visas?|immigration|international|qualified|candidates|the right candidate)|sponsorship (is )?available|open to sponsoring|h-?1b sponsorship (is )?available|provides? visa sponsorship|offers? visa sponsorship|sponsorship provided|sponsorship offered|will provide sponsorship|support (h-?1b|visa) (transfers|sponsorship))/;
  var AUTH_CITIZEN = /(u\.?s\.? citizen(ship)? (is |are )?(required|only)|must be (a )?(u\.?s\.?|united states) citizens?|us citizens only|united states citizen(ship)? (is )?required|citizenship is required|requires? (u\.?s\.?|united states) citizenship|only (u\.?s\.?|united states) citizens|u\.?s\.? persons? (as defined|only|status)|(?<![a-z])itar(?![a-z]))/;
  // citizens OR permanent residents ("U.S. persons", green card holders) - a different, wider door
  var AUTH_CITIZEN_PR = /(green card|permanent resident|lawful permanent|u\.?s\.? persons?|(?<![a-z])itar(?![a-z]))/;
  var AUTH_CLEAR = /(security clearance|secret clearance|top secret (clearance|security clearance|\/ ?sci|sci)|ts\/sci|ts sci|public trust (clearance|position|background)|active clearance|clearance (is )?required|ability to obtain (a |an )?(security |government )?clearance|dod clearance|polygraph|obtain and maintain (a |an )?(security )?clearance)/;
  var AUTH_CLEAR_OBTAIN = /(ability to obtain|able to obtain|eligible (to obtain|for) (a |an )?(security )?clearance|obtain and maintain|willing to obtain|must be able to obtain)/;
  var AUTH_CLEAR_ACTIVE = /((active|current|existing|valid)[a-z \/-]{0,30}(clearance|ts\/sci|ts sci|top secret)|(must|need to|required to) (have|hold|possess) (a |an )?(active |current )?[a-z \/-]{0,20}(clearance|ts\/sci)|(clearance|ts\/sci|ts sci)[a-z ,\/-]{0,24}(with|and) (a )?(full[- ]scope |ci )?(poly|polygraph))/;
  var QUESTION = /\?\s*$|^(will|do|are|would|can|have|does|is) you(?![a-z])/;
  // clearance levels: 1 Public Trust, 2 Secret (or DOE L), 3 Top Secret (or DOE Q), 4 TS/SCI
  var CLR_NAMES = ['', 'Public Trust', 'Secret', 'Top Secret', 'TS/SCI'];
  function clrLevelIn(t) {
    if (/(?<![a-z])(ts\s*\/\s*sci|ts[- ]sci)(?![a-z])|top[- ]secret\s*\/\s*sci|(?<![a-z])sci(?![a-z])/.test(t)) return 4;
    if (/top[- ]secret|(?<![a-z])q[- ](security\s+)?clearance/.test(t)) return 3;
    if (/(?<![a-z])secret(?![a-z])|(?<![a-z])l[- ](security\s+)?clearance/.test(t)) return 2;
    if (/public[- ]trust/.test(t)) return 1;
    return 0;
  }
  // what a posting only says you'd be ELIGIBLE for ("Secret (TS/SCI eligible)") isn't what it requires
  var CLR_ELIG = /\(?\s*(?:ts\s*\/\s*sci|ts[- ]sci|top[- ]secret(?:\s*\/\s*sci)?|secret|sci)\s+(?:eligible|eligibility)\s*\)?|(?:eligible|eligibility)\s+(?:for\s+)?(?:a\s+|an\s+)?(?:ts\s*\/\s*sci|ts[- ]sci|top[- ]secret(?:\s*\/\s*sci)?|sci|secret)/g;
  function jobClrLevel(low) { return clrLevelIn(low.replace(CLR_ELIG, ' ')) || 2; }   // a clearance of unstated level: read as Secret, the most common
  // a clearance you hold, from your resume: "active Secret clearance", "TS/SCI with CI poly" - never
  // one you're only eligible for, are pursuing, or that has lapsed
  var CAND_CLR_CTX = /clearance|ts\s*\/\s*sci|ts[- ]sci|top[- ]secret|cleared/;
  var CAND_CLR = /(?<![a-z])(?:(ts\s*\/\s*sci|ts[- ]sci|top[- ]secret(?:\s*\/\s*sci)?|secret|public[- ]trust)(?:\s+(?:security\s+|government\s+)?clearance)?|(q|l)\s+(?:security\s+)?clearance)(?![a-z])/g;
  var CAND_CLR_NOT_BEFORE = /(?:eligible|eligibility|able to obtain|ability to obtain|willing to obtain|willingness to obtain|pursuing|obtaining|in process for|pending|apply for|applying for|expired|lapsed|inactive|former|formerly held|previously held|previous|no)\s+(?:for\s+)?(?:a\s+|an\s+|the\s+)?(?:active\s+|current\s+|dod\s+|doe\s+|government\s+|federal\s+)?$/;
  var CAND_CLR_NOT_AFTER = /^\s*[(,:–-]?\s*(?:eligible|eligibility|pending|in process|in progress|expired|lapsed|inactive)(?![a-z])/;
  function candClearance(text) {
    var low = lc(text); if (!CAND_CLR_CTX.test(low)) return 0;
    var best = 0, m; CAND_CLR.lastIndex = 0;
    while ((m = CAND_CLR.exec(low)) !== null) {
      var lv = m[1] ? clrLevelIn(m[1]) : (m[2] === 'q' ? 3 : 2);
      if (lv <= best) continue;
      if (CAND_CLR_NOT_BEFORE.test(low.slice(h0(m.index - 40), m.index)) || CAND_CLR_NOT_AFTER.test(low.slice(m.index + m[0].length, m.index + m[0].length + 30))) continue;
      best = lv;
    }
    return best;
  }
  function parseAuth(segs) {
    var r = { noSponsorship: false, sponsors: false, citizenship: false, citizenOrPR: false, clearance: false, clearanceObtainable: false, clearanceActive: false, clearanceLevel: 0, clearancePreferred: false, evidence: {} };
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (g.section === 'about') continue;
      if (QUESTION.test(g.low)) continue;   // an application question ("Will you require sponsorship?") states no policy
      if (!r.noSponsorship && AUTH_NOSPON.test(g.low)) { r.noSponsorship = true; r.evidence.noSponsorship = trunc(g.text, 160); }
      else if (!r.sponsors && AUTH_SPONS.test(g.low) && !AUTH_NOSPON.test(g.low)) { r.sponsors = true; r.evidence.sponsors = trunc(g.text, 160); }
      if (g.cue === 'neg') continue;        // "US citizenship is not required", "no clearance needed"
      if (!r.citizenship && !r.citizenOrPR && AUTH_CITIZEN.test(g.low)) {
        if (AUTH_CITIZEN_PR.test(g.low)) { r.citizenOrPR = true; r.evidence.citizenOrPR = trunc(g.text, 160); }
        else { r.citizenship = true; r.evidence.citizenship = trunc(g.text, 160); }
      }
      if (!r.clearance && AUTH_CLEAR.test(g.low)) {
        // "Secret clearance preferred" / a Preferred section: a plus, never a requirement
        if (segImportance(g) === 'pref') { if (!r.clearancePreferred) { r.clearancePreferred = true; r.evidence.clearancePreferred = trunc(g.text, 160); } continue; }
        r.clearance = true; r.clearanceObtainable = AUTH_CLEAR_OBTAIN.test(g.low);
        r.clearanceActive = !r.clearanceObtainable && AUTH_CLEAR_ACTIVE.test(g.low);
        r.clearanceLevel = jobClrLevel(g.low);
        r.evidence.clearance = trunc(g.text, 160);
      }
    }
    if (r.noSponsorship) r.sponsors = false;
    if (r.citizenship) r.citizenOrPR = false;
    return r;
  }

  var NUM_TOK = '(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)';
  var SAL_RANGE = new RegExp('\\$\\s?' + NUM_TOK + '\\s*(k)?\\s*(?:-|to)\\s*\\$?\\s?' + NUM_TOK + '\\s*(k)?(\\s*(?:\\/|per|an|a)\\s*(?:hour|hr|year|yr|annum|annually|month|mo|week|wk)(?![a-z]))?');  // run on lowercased text: no /i (its unicode folding differs from Python's)
  var SAL_SINGLE = new RegExp('\\$\\s?' + NUM_TOK + '\\s*(k)?(\\s*(?:\\/|per|an|a)\\s*(?:hour|hr|year|yr|annum|month|mo|week|wk)(?![a-z]))');
  function perOf(per, hi) { return /hour|hr/.test(per) ? 'hour' : (/month|mo/.test(per) ? 'month' : (/week|wk/.test(per) ? 'week' : (/year|yr|annum|annual/.test(per) ? 'year' : (hi < 300 ? 'hour' : 'year')))); }
  function numTok(s) { return parseFloat(s.replace(/,/g, '')); }
  // a bonus, relocation or tuition figure is not the salary - unless the line also says it's pay
  var SAL_OTHER = /(bonus|sign-on|signing|relocation|tuition|stipend|reimburse|401\(?k\)?|referral|allowance|equity grant|rsus?(?![a-z])|retention|per diem|scholarship)/;
  var SAL_WORD = /(salary|base pay|base salary|pay range|pay rate|pay scale|compensation|wage|hourly rate|annual pay|starting pay|pay:|rate:|\/hr|\/hour|per hour|an hour|hourly)/;
  var SAL_EST = /(?<![a-z])(estimated|est\.|estimate)(?![a-z])/;
  function salaryFromText(segs) {
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (SAL_OTHER.test(g.low) && !SAL_WORD.test(g.low)) continue;
      var m = SAL_RANGE.exec(g.low), lo, hi, per, k1, k2, est = SAL_EST.test(g.low);
      if (m) {
        k1 = !!m[2]; k2 = !!m[4]; lo = numTok(m[1]); hi = numTok(m[3]); per = m[5] ? lc(m[5]) : '';
        if (k2 && !k1 && lo < 1000) k1 = true;
        if (k1) lo *= 1000; if (k2) hi *= 1000;
        var period = perOf(per, hi);
        if (period === 'year' && hi < 1000) continue;
        if (period === 'hour' && (lo < 7 || hi > 500)) continue;
        if (period === 'year' && (lo < 15000 || hi > 1000000)) continue;
        if (hi < lo) continue;
        return { min: lo, max: hi, period: period, text: trunc(g.text, 140), est: est };
      }
      m = SAL_SINGLE.exec(g.low);
      if (m) {
        var v = numTok(m[1]); if (m[2]) v *= 1000;
        var pr = perOf(lc(m[3]), v);
        if (pr === 'hour' && (v < 7 || v > 500)) continue;
        if (pr === 'year' && (v < 15000 || v > 1000000)) continue;
        return { min: v, max: v, period: pr, text: trunc(g.text, 140), est: est };
      }
    }
    return null;
  }
  var ANNUAL_X = { hour: 2080, day: 260, week: 52, month: 12, year: 1 };
  function annualize(v, period) { return v == null ? null : rhu(v * (ANNUAL_X[period] || 1)); }
  var NO_PAY = { min: null, max: null, period: null, annualMin: null, annualMax: null, source: null, text: '' };
  function payOk(lo, hi) { return lo != null && hi != null && lo >= 5000 && hi <= 2000000; }   // cents, typos and stipends aren't a salary
  function parseSalary(n, segs) {
    if (n.salaryMin != null || n.salaryMax != null) {
      var per = n.salaryPeriod || 'year';
      var mn = n.salaryMin != null ? n.salaryMin : n.salaryMax, mx = n.salaryMax != null ? n.salaryMax : n.salaryMin;
      if (mx < mn) { var tmp = mn; mn = mx; mx = tmp; }
      var am = annualize(mn, per), ax = annualize(mx, per);
      if (payOk(am, ax)) return { min: mn, max: mx, period: per, annualMin: am, annualMax: ax, source: n.salaryPredicted === true ? 'estimated' : 'listed', text: '' };
    }
    var p = salaryFromText(segs);
    if (p) {
      var pm = annualize(p.min, p.period), px = annualize(p.max, p.period);
      if (payOk(pm, px)) return { min: p.min, max: p.max, period: p.period, annualMin: pm, annualMax: px, source: p.est ? 'estimated' : 'parsed', text: p.text };
    }
    return Object.assign({}, NO_PAY);
  }

  var TRAVEL_RE = /(?:up to|approximately|about|around|~)?\s*(\d{1,3})\s*%\s*(?:of the time\s*)?(?:travel|travelling|traveling|domestic travel)|travel(?:ing)?\s*(?:required\s*)?(?:up to|of up to|approximately|about|around|~|:|-)?\s*(\d{1,3})\s*%/;
  function parseTravel(segs) {
    for (var i = 0; i < segs.length; i++) {
      var m = TRAVEL_RE.exec(segs[i].low);
      if (m) { var v = parseInt(m[1] || m[2], 10); if (v >= 0 && v <= 100) return v; }
    }
    return null;
  }

  function parseIndustries(n, segs) {
    var I = idx();
    var intro = '', aboutTxt = '';
    var acc = 0;
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].section === 'about') aboutTxt += ' ' + segs[i].low;
      if (acc < 400) { intro += ' ' + segs[i].low; acc += segs[i].low.length; }
    }
    var org = lc(n.org), text = aboutTxt + ' ' + intro;
    var out = [];
    TAX.industries.forEach(function (d) {
      var hits = [], orgHit = false;
      d.keywords.forEach(function (k) {
        if (hasWord(org, k)) { orgHit = true; if (hits.indexOf(k) === -1) hits.push(k); }
        else if (hasWord(text, k) && hits.indexOf(k) === -1) hits.push(k);
      });
      if (orgHit || hits.length >= 2) out.push({ id: d.id, name: d.name, hits: hits.slice(0, 4), strength: hits.length + (orgHit ? 2 : 0) });
    });
    out.sort(function (a, b) { return b.strength - a.strength; });
    return out.slice(0, 2);
  }

  // A staffing firm's name is the WHOLE company name (plus words like "Group" or
  // "International") - "Hays County" and "Volt Energy" are not Hays or Volt.
  var AGENCY_TAIL = /^(international|global|usa|us|americas|north america|technology|technologies|talent|talent solutions|staffing|staffing services|recruitment|recruiting|resources|workforce|consulting|services|solutions|it|professional|professionals|search)( (international|global|usa|us|technology|technologies|talent|solutions|staffing|recruitment|recruiting|resources|services|group))*$/;
  function agencyNameOf(org) {
    var o = normOrg(org);
    if (!o) return null;
    for (var i = 0; i < TAX.agency_names.length; i++) {
      var a = TAX.agency_names[i];
      if (o === a) return a;
      if (o.indexOf(a + ' ') === 0 && AGENCY_TAIL.test(o.slice(a.length + 1))) return a;
    }
    return null;
  }
  var NEG_BEFORE = /(?<![a-z])(no|not|never|without|isn't|is not|aren't|are not)\s+(a\s+|an\s+|any\s+)?$/;
  function phraseHit(text, list) {
    // the first listed phrase that appears as whole words and isn't negated ("No C2C", "not a general application")
    for (var i = 0; i < list.length; i++) {
      var ph = list[i];
      if (text.indexOf(ph) === -1) continue;
      var re = new RegExp(B4 + escRe(ph) + AF, 'g'), m;
      while ((m = re.exec(text)) !== null) {
        if (!NEG_BEFORE.test(text.slice(h0(m.index - 16), m.index))) return ph;
      }
    }
    return null;
  }
  function parseAgency(n, segs) {
    var org = lc(n.org), reasons = [];
    var nm = agencyNameOf(n.org);
    if (nm) reasons.push('"' + n.org + '" is a staffing/recruiting firm');
    else { var w = hasAnyWord(org, TAX.agency_name_words); if (w) reasons.push('company name contains "' + w + '"'); }
    var all = segs.map(function (g) { return g.low; }).join(' \n ');
    var ph = phraseHit(all, TAX.agency_phrases);
    if (ph) reasons.push('posting says "' + ph + '"');
    return { is: reasons.length > 0, reasons: reasons };
  }
  function parseEvergreen(n, segs) {
    // only what the posting says about ITSELF - not company copy, not the company's name
    var all = lc(n.title) + ' \n ' + segs.filter(function (g) { return g.section !== 'about'; }).map(function (g) { return g.low; }).join(' \n ');
    var ph = phraseHit(all, TAX.evergreen_phrases);
    return { is: !!ph, phrase: ph || null };
  }

  function findRoles(text) {
    var I = idx(), low = lc(text), out = [], m, seen = {};
    I.roleRe.lastIndex = 0;
    while ((m = I.roleRe.exec(low)) !== null) {
      var rid = I.roleMap[m[1]];
      if (!seen[rid]) { seen[rid] = 1; out.push({ id: rid, name: I.role[rid].name, pattern: m[1], len: m[1].length }); }
    }
    out.sort(function (a, b) { return b.len - a.len || I.role[a.id]._i - I.role[b.id]._i; });
    return out.slice(0, 3).map(function (r) { return { id: r.id, name: r.name, pattern: r.pattern }; });
  }

  /* -------------------------------------------------------- canonical key */
  var ORG_SUFFIX = /(?<![a-z0-9])(inc|incorporated|llc|l\.l\.c|ltd|limited|corp|corporation|co|company|plc|gmbh|the|group|holdings)(?![a-z0-9])/g;
  // pure, and called for every list entry on every job - so each distinct name is normalised once
  var NORM_ORG_MEMO = new Map(), KW_MEMO = new Map();
  function memo(m, k, fn) { var v = m.get(k); if (v === undefined) { if (m.size > 20000) m.clear(); v = fn(k); m.set(k, v); } return v; }
  function normOrgL(l) { return l.replace(/^(.+?),\s*(the\s+)?(city|county|town|village|township|borough|state|commonwealth|district|port|parish) of\s*$/, '$3 of $1').replace(/&/g, ' and ').replace(ORG_SUFFIX, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function normOrg(org) { return memo(NORM_ORG_MEMO, lc(org), normOrgL); }
  function kwNorm(k) { return memo(KW_MEMO, lc(k), function (l) { return qHyph(l.trim()); }); }
  function normTitle(title) {
    return lc(title).replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
      .replace(/(?<![a-z])sr\.?(?![a-z])/g, 'senior').replace(/(?<![a-z])jr\.?(?![a-z])/g, 'junior').replace(/(?<![a-z])mgr\.?(?![a-z])/g, 'manager').replace(/(?<![a-z])asst\.?(?![a-z])/g, 'assistant')
      .replace(/(?<![a-z0-9])(req|job|id|requisition)\s*#?\s*[a-z0-9-]*\d[a-z0-9-]*/g, ' ')
      .replace(/#\s*\d+/g, ' ')
      .replace(/(?<![a-z])(remote|hybrid|onsite|on-site|in-office|us|usa|wfh)(?![a-z])/g, ' ')
      .replace(/[^a-z0-9+#]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // No real company name: two such postings are never "the same job" (no merging, no repost count)
  var NO_ORG = /^(unknown|unknown employer|confidential|confidential employer|undisclosed|not disclosed|not specified|unspecified|n a|na|none|null|anonymous|private|private employer|stealth|stealth startup|stealth mode|stealth mode startup|hiring|employer|our client|client|various|multiple|multiple employers)$/;
  function canonicalKey(job) {
    var org = normOrg(job.org);
    if (!org || NO_ORG.test(org)) return '#' + str(job.id);
    var place = job.mode === 'remote' ? 'remote' : (job.places && job.places.length ? (job.places[0].metro || job.places[0].state || lc(job.places[0].label)) : lc(job.location));
    return org + '|' + normTitle(job.title) + '|' + place;
  }

  /* ------------------------------------------------------------ parseJob */
  var ORLIST_ANY = /(?<![a-z])(or|and\/or)(?![a-z])|[a-z0-9+#)]\s*\/\s*[a-z(]/;
  function h0(x) { return x > 0 ? x : 0; }
  var OR_GENERIC = /^\s*[()]?\s*,?\s*\(?\s*(or|and\/or)\s+(a |an |any |some |other |another )?(similar|equivalent|comparable|related|other|another|alternative|like)(?![a-z])|^\s*\/\s*(similar|equivalent|other)(?![a-z])|^\s*[a-z ]{0,30}?[()]?\s*,?\s*\(?\s*(or|and\/or)\s+(at least |a minimum of |minimum of )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*(-\s*\d+\s*)?(years?|yrs?)(?![a-z])/;
  // "Tableau or similar" offers a choice we can't see; "RN license or compact license" doesn't
  function orGeneric(low, h) { return OR_GENERIC.test(low.slice(h.end, h.end + 60)); }
  // The employer's own name is not a skill ("Cardinal Payroll is hiring" is no payroll requirement)
  function maskOrg(text, orgLow) {
    if (!orgLow || orgLow.length < 4) return text;
    var low = lc(text);
    if (low.length !== text.length || low.indexOf(orgLow) === -1) return text;
    var out = '', from = 0, at;
    while ((at = low.indexOf(orgLow, from)) !== -1) {
      var pre = at > 0 ? low.charAt(at - 1) : '', post = low.charAt(at + orgLow.length);
      if (/[a-z0-9]/.test(pre) || /[a-z0-9+#&]/.test(post)) { out += text.slice(from, at + 1); from = at + 1; continue; }
      out += text.slice(from, at) + new Array(orgLow.length + 1).join(' ');
      from = at + orgLow.length;
    }
    return out + text.slice(from);
  }
  // "Bachelor's degree in Statistics, Economics or a related field" names a FIELD OF STUDY,
  // not a statistics skill requirement
  var DEGREE_SUBJ = /(degree|bachelor's|bachelors|master's|masters|b\.s\.|b\.a\.|m\.s\.|bs|ba|ms|ma|phd|ph\.d\.|major|majoring|diploma|concentration)\s+(in|of)\s+/g;
  var DEGREE_STOP = /(required|preferred|or equivalent|or (a )?related|or (a )?similar|or other|with |experience|plus|including|and at least|\d|;|\.(\s|$)|\(|:)/;
  function degreeSpans(low) {
    var out = [], m;
    if (low.indexOf(' in ') === -1 && low.indexOf(' of ') === -1) return out;
    DEGREE_SUBJ.lastIndex = 0;
    while ((m = DEGREE_SUBJ.exec(low)) !== null) {
      if (m.index > 0 && /[a-z0-9]/.test(low.charAt(m.index - 1))) continue;
      var st = m.index + m[0].length, rest = low.slice(st, st + 100), sm = DEGREE_STOP.exec(rest);
      out.push([st, st + (sm ? sm.index : rest.length)]);
    }
    return out;
  }
  var TEAM_ALIAS = /^(customer success|sales|marketing|product management|engineering|design|finance|legal|operations|customer support|support|data science|recruiting|hr|product|account management|supply chain|data analytics|user research|ux research|devops|quality assurance|business intelligence|people operations|procurement)$/;
  var TEAM_AFTER = /^\s+(teams?|departments?|org|organization|leaders|leadership|stakeholders)(?![a-z])/;
  // "you will grow toward project management", "we'll train you in Civil 3D": where the job takes you, not what it asks for
  var GROWTH_BEFORE = /(?<![a-z])(grow (toward|towards|into)|growth (toward|towards|into)|path (to|toward|towards|into)|progress (toward|towards|into)|advance (toward|towards|into)|opportunit(y|ies) to (learn|grow|develop|gain|build|get)|(you will|you'll|you will be|you'll be) (learn|learning|trained|mentored|taught)|we('ll| will) (train|teach|mentor) you|(train|training|trained) you (in|on)|on-the-job training (in|on)|learn (to|how to)|(and|to|will|you('ll| will)|chance to|help you)\s+learn)[a-z ,&\/-]{0,30}$/;
  var INTEREST_BEFORE = /(?<![a-z])(interest in|interested in|passion for|passionate about|curiosity (about|for)|curious about|enthusiasm for|eager to learn|willing(ness)? to learn|desire to learn|excited (about|by)|appreciation for)[a-z ,&\/-]{0,30}$/;
  var COLLAB_ANY = /(partner|collaborat|work closely|working closely|works closely|liaise|liaising|coordinat|alongside|cross-functional)/;
  var COLLAB_BEFORE = /(partner|partnering|partners|collaborate|collaborating|collaborates|work closely|working closely|works closely|liaise|liaising|coordinate|coordinating|alongside|cross-functionally|cross-functional)( with)?[a-z ,&\/-]{0,60}$/;
  function orFlags(low, hits) {
    // Which skill mentions sit in an "A or B" / "A, B or C" / "A/B" list - a
    // choice, not a list of things you need all of.
    var res = hits.map(function () { return false; });
    if (!ORLIST_ANY.test(low)) return res;
    for (var i = 0; i < hits.length; i++) {
      // look only at the neighbourhood (a long list must not cost O(n) per mention);
      // \u0000 marks a cut-off window so "^" never fakes a sentence start
      var bs = h0(hits[i].at - 40), h = hits[i];
      var before = (bs > 0 ? '\u0000' : '') + low.slice(bs, h.at), after = low.slice(h.end, h.end + 300);
      if (/^\s*\)?\s*,?\s*(or|and\/or)\s/.test(after) || /^\s*\/\s*\S/.test(after)) res[i] = true;
      else if (/(^|[\s,(])(or|and\/or)\s*$/.test(before) || /\S\s*\/\s*$/.test(before)) res[i] = true;
      else {
        var lm = /^((\s*,\s*[^,;.()]{1,40}){1,6})\s*,?\s*(or|and\/or)\s/.exec(after);
        if (lm && !/(?<![a-z])(in|with|using|for|of|on|to|at|by|from)(?![a-z])/.test(lm[1])) res[i] = true;
      }
    }
    return res;
  }
  var MGMT_REQ = /(?<![a-z])(people management|people manager|managing (a |the )?(team|teams|people|staff|direct reports|engineers|designers|analysts|nurses|associates|group)|managing ([a-z]+ ){1,3}(teams|staff|reps|representatives)|manage (a |the )?(team|teams|people|staff|direct reports|engineers|designers|analysts)|supervis(ing|ory) (experience|staff|employees|a team|others|teams)|direct reports|lead(ing)? (a |the )?teams? of|manage a team of|(people|team|staff) management|\d+\+?\s*(years?|yrs?) (of )?(people |team )?(management|managing|supervisory|leadership) experience|\d+\+?\s*(years?|yrs?) (of )?(formal|proven|direct|prior|progressive|nursing|clinical|operational|frontline|front-line|line) (people |team )?(management|supervisory|leadership) experience|\d+\+?\s*(years?|yrs?) (of |in )?(an? )?([a-z]+ ){0,2}(leadership|management|managerial|supervisory) (role|position)s?)(?![a-z])/;
  // Remote, but only for some states or time zones ("must reside in the Eastern or Central time zone",
  // "open to candidates in TX, CA and NY", "excluding California")
  var ST_ZONE = { CT: 'ET', DE: 'ET', DC: 'ET', FL: 'ET', GA: 'ET', IN: 'ET', KY: 'ET', ME: 'ET', MD: 'ET', MA: 'ET', MI: 'ET', NH: 'ET', NJ: 'ET', NY: 'ET', NC: 'ET', OH: 'ET', PA: 'ET', RI: 'ET', SC: 'ET', VT: 'ET', VA: 'ET', WV: 'ET',
    AL: 'CT', AR: 'CT', IL: 'CT', IA: 'CT', KS: 'CT', LA: 'CT', MN: 'CT', MS: 'CT', MO: 'CT', NE: 'CT', ND: 'CT', OK: 'CT', SD: 'CT', TN: 'CT', TX: 'CT', WI: 'CT',
    AZ: 'MT', CO: 'MT', ID: 'MT', MT: 'MT', NM: 'MT', UT: 'MT', WY: 'MT', CA: 'PT', NV: 'PT', OR: 'PT', WA: 'PT', AK: 'AKT', HI: 'HT' };
  var ZONE_NAMES = { ET: 'Eastern', CT: 'Central', MT: 'Mountain', PT: 'Pacific', AKT: 'Alaska', HT: 'Hawaii' };
  var LIMIT_CUE = /(must (reside|live|be located|be based|be in)|(candidates|applicants|employees) (must )?(reside|live|be located|be based|located|residing|based)|open (only )?to (candidates|applicants|residents|people) (in|of|located in|residing in|based in)|only (considering|hiring|accepting|able to hire|open to) (candidates |applicants |people |residents )?(in|from|located in|residing in)|we (can|are able to|currently) (only )?hire (in|from)|residents of|eligible (states|locations)|remote (in|within|from) (the )?(following|these)|time ?zones?)/;
  var EXCL_CUE = /(excluding|except( for)?|not (available|open|eligible) (in|to (residents of|candidates in))|(cannot|can't|unable to|are not able to) (hire|employ) (in|residents of|candidates in))\s+/;
  var ZONE_RE = /(?<![a-z])(eastern|central|mountain|pacific)( standard)?( time)?(?![a-z])/g;
  function statesIn(text, low) {
    var I = idx(), out = [], m;
    I.stateNameRe.lastIndex = 0;
    while ((m = I.stateNameRe.exec(low)) !== null) { var c = I.stateByName[m[1]]; if (c && out.indexOf(c) === -1) out.push(c); }
    var re = /(?<![A-Za-z])([A-Z]{2})(?![A-Za-z])/g;
    while ((m = re.exec(text)) !== null) { if (m[1] !== 'US' && own(TAX.us_states, m[1]) && out.indexOf(m[1]) === -1) out.push(m[1]); }
    return out;
  }
  var TZ_PREF = /(?<![a-z])(preferred|preference|prefer|prefers|ideally|a plus|nice to have|bonus|helpful)(?![a-z])/;
  var TZ_HOURS = /(?<![a-z])(hours|business hours|working hours|work hours|overlap|availability|available during|schedule|shifts?|meetings|core hours|coverage)(?![a-z])/;
  // "time zones preferred" is a wish; "Eastern time zone hours" is a schedule - but "must reside in
  // the Central time zone (to overlap with the team)" is still a residency rule
  function softLimit(low, lm) { var cl = clauseOf(low, lm.index); return TZ_PREF.test(cl) || (/^time ?zones?$/.test(lm[0]) && TZ_HOURS.test(cl)); }
  // the sentence clause around a cue (so "...; Spanish preferred" elsewhere doesn't soften it)
  function clauseOf(low, at) { var a = Math.max(low.lastIndexOf('.', at), low.lastIndexOf(';', at)) + 1, b = low.slice(at).search(/[.;]/); return low.slice(a, b === -1 ? low.length : at + b); }
  function parseRemoteLimit(segs, loc) {
    var r = { states: [], zones: [], excluded: [], text: '' };
    var pool = [{ text: loc || '', low: lc(loc), section: 'none' }].concat(segs);
    for (var i = 0; i < pool.length; i++) {
      var g = pool[i];
      if (g.section === 'about' || g.section === 'benefits') continue;
      var lm = LIMIT_CUE.exec(g.low), em = EXCL_CUE.exec(g.low), hit = false;
      if (em) {
        var tail = g.text.slice(em.index + em[0].length, em.index + em[0].length + 120), ex = statesIn(tail, lc(tail));
        ex.forEach(function (c) { if (r.excluded.indexOf(c) === -1) r.excluded.push(c); }); if (ex.length) hit = true;
      }
      if (lm && softLimit(g.low, lm)) lm = null;
      if (lm) {
        var st0 = lm.index + lm[0].length, tl = g.text.slice(st0, st0 + 160), tlow = lc(tl), cut = EXCL_CUE.exec(tlow);
        if (cut) { tl = tl.slice(0, cut.index); tlow = tlow.slice(0, cut.index); }
        statesIn(tl, tlow).forEach(function (c) { if (r.states.indexOf(c) === -1 && r.excluded.indexOf(c) === -1) { r.states.push(c); hit = true; } });
        var zm; ZONE_RE.lastIndex = 0;
        var zsrc = /time ?zones?/.test(lm[0]) ? g.low : tlow;
        while ((zm = ZONE_RE.exec(zsrc)) !== null) { if (/time|zone/.test(zsrc.slice(zm.index, zm.index + 40))) { var z = { eastern: 'ET', central: 'CT', mountain: 'MT', pacific: 'PT' }[zm[1]]; if (r.zones.indexOf(z) === -1) { r.zones.push(z); hit = true; } } }
      }
      if (hit && !r.text) r.text = trunc(g.text, 140);
    }
    return (r.states.length || r.zones.length || r.excluded.length) ? r : null;
  }
  // a license tied to a state ("Active RN license in Illinois", "Texas teaching certificate")
  var LIC_WORD = /(license|licensure|licensed|certificate|certification|credential|(?<![a-z])(lcsw|lscsw|licsw|lisw|lmsw|lpc|lpcc|lmhc|lmft)(?![a-z]))/;
  var LIC_ACR = 'lcsw|lscsw|licsw|lisw|lisw-s|lmsw|lpc|lpcc|lmhc|lmft|rn|lpn|aprn|pe|cpa';
  var LIC_NEAR = new RegExp('(license|licensure|licensed|certificate|certification|credential)[^.;:]{0,40}?(in|from|by|of) (the state of )?$|(license|licensure|licensed|certificate|certification|credential|(?<![a-z])(' + LIC_ACR + '))[^.;:]{0,60}?\\s[-–—,:(]\\s*(the state of )?$|(license|licensure|certificate|certification|credential|(?<![a-z])(' + LIC_ACR + '))\\s*[-–—,:(]\\s*(the state of )?$');
  // "not licensed in Kansas", "no license in Texas yet"
  var LIC_NEG_BEFORE = /(?<![a-z])(not|no|never|un|without|except|excluding)\s*(currently\s+|yet\s+|a\s+)?(licensed|license[ds]?|licensure|certified)[^.;:]{0,30}?$/;
  var LIC_AFTER_ACR = new RegExp('^\\s*(state\\s+)?(independent\\s+)?(' + LIC_ACR + ')(?![a-z])');
  var LIC_AFTER_WORDS = /^\s*(state\s+)?([a-z-]+\s+){0,3}(license|licensure)(?![a-z])/;
  function licenseStates(text) {
    var low = lc(text), I = idx(), out = [], m;
    if (!LIC_WORD.test(low)) return out;
    I.stateNameRe.lastIndex = 0;
    while ((m = I.stateNameRe.exec(low)) !== null) {
      var after = low.slice(m.index + m[1].length, m.index + m[1].length + 64), before = low.slice(h0(m.index - 70), m.index);
      if (LIC_NEG_BEFORE.test(before)) continue;
      if (LIC_AFTER_ACR.test(after) || LIC_AFTER_WORDS.test(after) || /^\s*(state\s+)?(01\s+)?(general\s+)?(board of nursing |rn |lpn |nursing |teaching |educator |professional educator |cpa |professional |pharmacist |pharmacy |medical |physical therapy |social work |counselor |real estate |journeyman electrician |master electrician |journeyman electrical |master electrical |electrical contractor |electrician |electrical |journeyman |master |plumbing |hvac )?(license|licensure|certificate|certification|credential)/.test(after) || LIC_NEAR.test(before)) {
        var c = I.stateByName[m[1]]; if (c && out.indexOf(c) === -1) out.push(c);
      }
    }
    var re = /(?<![A-Za-z])([A-Z]{2})\s+(RN |LPN |CPA |PE |teaching |nursing |professional |01 |journeyman electrician |master electrician |electrical |electrician |journeyman |master )?(license|licensure|certificate|certification|LCSW|LSCSW|LICSW|LISW|LMSW|LPC|LPCC|LMHC|LMFT)(?![A-Za-z])/g;
    while ((m = re.exec(text)) !== null) { if (own(TAX.us_states, m[1]) && out.indexOf(m[1]) === -1 && !LIC_NEG_BEFORE.test(lc(text.slice(h0(m.index - 70), m.index)))) out.push(m[1]); }
    return out;
  }
  var LIC_TRANSFER = /(?<![a-z])(reciprocity|by endorsement|licensure by endorsement|transfer (of )?(your |their |a |the )?licen[cs](e|ure)|licensed (at the [a-z ]+ level )?in another state|out[- ]of[- ]state licen[cs]|another state may apply|(obtain|get|secure|acquire|transfer)[a-z ]{0,40}licens(e|ure)[a-z ,]{0,40}within \d+ (days|months)|eligible for (licensure|a license) in|(ability|able|willing(ness)?) to obtain [a-z ]{0,30}licens(e|ure))(?![a-z])/;
  function parseLicense(segs) {
    var r = { states: [], compactOk: false, transferOk: false, text: '' };
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i], imp = segImportance(g);
      if (!imp || imp === 'pref') continue;
      var ls = licenseStates(g.text);
      if (ls.length) { ls.forEach(function (c) { if (r.states.indexOf(c) === -1) r.states.push(c); }); if (!r.text) r.text = trunc(g.text, 140); if (LIC_TRANSFER.test(g.low)) r.transferOk = true; }
      if (/(compact|multistate|multi-state)/.test(g.low) && LIC_WORD.test(g.low)) r.compactOk = true;
    }
    return r.states.length ? r : null;
  }
  // "required": the role involves managing people (what the "no management" filter reads).
  // "asks": the posting asks for management EXPERIENCE you must already have - only that can
  // cap your fit. "You'll lead a team of three" is the job, not a prerequisite, and
  // "experience managing people or agencies" can be met without ever having had reports.
  var MGMT_EXP = /(?<![a-z])(experience (managing|leading|supervising|building and leading|building and managing|hiring and managing|as a (people )?manager)|(management|managerial|supervisory|leadership|people[- ]management) experience|(years?|yrs?) (of )?(experience )?(managing|leading|supervising)|(years?|yrs?) (of |in )?(an? )?([a-z]+ ){0,2}(leadership|management|managerial|supervisory) (role|position)s?|track record of (managing|leading|building)|proven (ability to (manage|lead)|(people )?(management|leadership))|(have|has|having) (previously )?(managed|led|supervised)|prior (people )?(management|managerial|supervisory))(?![a-z])/;
  var MGMT_DUTY = /(?<![a-z])(you('ll| will| would)|will (lead|manage|oversee|supervise|build and lead|grow and lead)|this (role|person|position|hire) (will )?(leads?|manages?|oversees?|supervises?))(?![a-z])/;
  var MGMT_ALT = /(?<![a-z])(people|teams?|staff|direct reports)\s+(or|and\/or)\s+(an? )?(agenc(y|ies)|vendors?|contractors?|freelancers?|partners?|projects?|programs?|budgets?|clients?|accounts?)(?![a-z])|(?<![a-z])(agenc(y|ies)|vendors?|contractors?|freelancers?)\s+(or|and\/or)\s+(people|teams?|staff)(?![a-z])/;
  // "leading a team without direct people management", "a non-supervisory role": management ruled OUT
  var MGMT_NEG = /(?<![a-z])(?:(?:without|no|not|never|zero)\s+(?:any\s+|direct\s+|formal\s+|official\s+|line\s+)*(?:people[- ]management|people[- ]managers?|management|managerial|supervisory|supervision|managing people|direct reports)(?:\s+(?:duties|responsibilit(?:y|ies)|experience|required|needed|expected))?|non[- ]?(?:management|managerial|supervisory)|individual[- ]contributor)(?![a-z])/g;
  function parseMgmt(segs) {
    var r = { required: false, asks: false, text: '' };
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i], imp = segImportance(g);
      if (!imp || imp === 'pref') continue;
      var low = g.low.replace(MGMT_NEG, ' ');
      if (!MGMT_REQ.test(low)) continue;
      if (!r.required) { r.required = true; r.text = trunc(g.text, 140); }
      if (!MGMT_ALT.test(low) && (MGMT_EXP.test(low) || (imp === 'req!' && !MGMT_DUTY.test(low)))) { r.asks = true; r.text = trunc(g.text, 140); break; }
    }
    return r;
  }
  var ENROLL_REQ = /(?<![a-z])(currently enrolled|must be (currently )?enrolled|(currently|actively) pursuing (a |an |your )?(bachelor's|bachelors|master's|masters|undergraduate|graduate|degree|bs|ba|ms|phd|mba|b\.s\.|m\.s\.)|current(ly)? (a )?(student|undergraduate|graduate student)|returning to (school|campus|your studies)|rising (junior|senior|sophomore)s?|must be a (current )?(student|undergraduate|graduate student)|enrolled (full[- ]time )?in (an? )?(accredited )?(bachelor's|bachelors|master's|masters|undergraduate|graduate|degree|university|college|phd)|pursuing (a|an) (bachelor's|bachelors|master's|masters|undergraduate|graduate|degree|bs|ba|ms|phd))(?![a-z])/;
  var GRAD_WIN = /graduat(?:e|es|ing|ion)(?: date)?(?: of)?[a-z ,:]{0,24}?(?:between |from )?((?:[a-z]+\.? )?\d{4})\s*(?:and|-|to|through|or)\s*((?:[a-z]+\.? )?\d{4})/;
  var RETURNING = /(?<![a-z])(returning to (school|campus|your studies|university|college|classes)|return(ing)? to (school|campus|your studies) after|at least one (more )?(semester|quarter|term|year) (of (school|study|coursework) )?remaining|continu(e|ing) (your )?(studies|education|degree) after)(?![a-z])/;
  var TERM_RE = /(?<![a-z])(summer|fall|autumn|spring|winter) (20\d\d)(?![0-9])/;
  var CLASS_OF = /(?<![a-z])class of (20\d\d)(?:\s*(?:or|and|\/|-)\s*(20\d\d))?/;
  function parseEnroll(segs, title) {
    // internship / new-grad eligibility: "currently enrolled", "graduating Dec 2026 - Jun 2027"
    var r = { required: false, gradFrom: null, gradTo: null, text: '', returning: false, termEnd: null };
    for (var i = 0; i < segs.length; i++) {
      var g = segs[i];
      if (g.section === 'about' || g.section === 'benefits' || g.cue === 'neg') continue;
      if (!r.required && segImportance(g) !== 'pref' && ENROLL_REQ.test(g.low)) { r.required = true; r.text = trunc(g.text, 140); }
      if (!r.returning && RETURNING.test(g.low)) { r.required = true; r.returning = true; r.text = trunc(g.text, 140); }
      if (r.termEnd == null) r.termEnd = termEndOf(g.low);
      if (r.gradFrom == null) {
        var m = GRAD_WIN.exec(g.low);
        if (m) {
          var a = parseMonth(m[1], 0), b = parseMonth(m[2], 0);
          if (a != null && b != null && b >= a) { r.gradFrom = a; r.gradTo = /^\d{4}$/.test(m[2].trim()) ? b + 11 : b; if (!r.text) r.text = trunc(g.text, 140); }
        } else {
          var c = CLASS_OF.exec(g.low);
          if (c) { var y1 = parseInt(c[1], 10), y2 = c[2] ? parseInt(c[2], 10) : y1; if (y2 >= y1) { r.gradFrom = y1 * 12 + 1; r.gradTo = y2 * 12 + 12; if (!r.text) r.text = trunc(g.text, 140); } }
        }
      }
    }
    if (r.termEnd == null && title) r.termEnd = termEndOf(lc(title));   // "UX Research Intern, Summer 2027"
    return r;
  }
  function termEndOf(low) { var tm = TERM_RE.exec(low); return tm ? parseInt(tm[2], 10) * 12 + ({ spring: 5, summer: 8, fall: 12, autumn: 12, winter: 3 })[tm[1]] : null; }
  var HIRE_CUE = /(?<![a-z])(we('re| are) (hiring|looking for|seeking)|(is|are) (hiring|looking for|seeking)|hiring (an?|our)|looking for (an?|our)|seeking (an?|our)|searching for (an?|our)|join (us|our team|the team) as|as (a|an|our)|(in )?the role of|position of|we need (an?|our)|you('ll| will) (join|be) (us |our team )?as)(?![a-z])/;
  var NEWGRAD_RE = /(?<![a-z])(new grads?|new graduates?|recent graduates?|recent grads?|graduating (in|by|between)|class of 20\d\d|entry[- ]level|early[- ]career|no (prior )?experience (needed|required|necessary)|no experience needed)(?![a-z])/;

  var CERT_SOFT = /(?<![a-z])([a-z+]+-eligible|(license|licensure|certification|board|exam|cpa|pe|rn) eligible|eligible to (sit|obtain|apply)|candidates? (welcome|encouraged|considered)|or (actively |currently )?(pursuing|working towards?|on track)|on track (to|for)|or (the )?ability to obtain|ability to obtain|obtain within|willingness to (obtain|earn|pursue)|within \d+ (days|months|year|years) of (hire|start))(?![a-z])/;
  var COMPLIANT_SETUP = /^[- ]compliant\s+([a-z-]+\s+){0,2}(home office|office space|workspace|work space|internet|connection|devices?|setup|set-up|room|computer|phone line)(?![a-z])/;
  var QUAL_SOFT = /(?<![a-z])(encouraged|welcome|eligible|candidates?|a plus|preferred|track|support)(?![a-z])/;

  /* ------------------------------------------- open-vocabulary requirement matching */
  // The taxonomy can't name every tool, code and practice in every field. The posting's own requirement
  // words - "HEC-RAS", "ASC 606", "FlowJo", "flow cytometry", "board portals" - checked against your resume
  // as you wrote it, fill the gap. Codes and product names are matched whole; ordinary words are weighed by
  // how specific they are (a word every posting uses - "experience", "team" - weighs nothing).
  var VOCAB_W = null, PLACE_TOK = null;
  function vocabWeight(w) {
    if (!VOCAB_W) {
      VOCAB_W = dict(); var vc = TAX.vocab_common || {};
      (vc.mid || []).forEach(function (x) { VOCAB_W[x] = 0.6; }); (vc.low || []).forEach(function (x) { VOCAB_W[x] = 0.3; }); (vc.stop || []).forEach(function (x) { VOCAB_W[x] = 0; });
    }
    var v = own(VOCAB_W, w); return v == null ? 1 : v;
  }
  var MONTH_DAY = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'mon', 'tue', 'tues', 'wed', 'thu', 'thur', 'thurs', 'fri', 'sat', 'sun'];
  function placeTok(w) {
    if (!PLACE_TOK) {
      PLACE_TOK = dict();
      Object.keys(TAX.us_states).forEach(function (k) { lc(TAX.us_states[k]).split(/[^a-z0-9]+/).forEach(function (t) { if (t) PLACE_TOK[t] = 1; }); });
      TAX.metros.forEach(function (m) { lc(m.name).split(/[^a-z0-9]+/).forEach(function (t) { if (t) PLACE_TOK[t] = 1; }); });
      // suburbs and towns too ("Murfreesboro", "Olathe") - but not the everyday words some towns are named for ("enterprise", "mission")
      TAX.metros.forEach(function (m) { m.aliases.forEach(function (a) { a.split(/[^a-z0-9]+/).forEach(function (t) { if (t.length >= 4 && vocabWeight(t) === 1) PLACE_TOK[t] = 1; }); }); });
      MONTH_DAY.forEach(function (t) { PLACE_TOK[t] = 1; });
    }
    return !!own(PLACE_TOK, w);
  }
  // plural -> singular, the same way on both sides ("meetings" ~ "meeting", "assays" ~ "assay", "SOPs" ~ "SOP")
  function vStem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(sses|shes|ches|xes|zes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/(ss|us|is|ys|as|os)$/.test(w)) return w.slice(0, -1);
    return w;
  }
  // codes and product names: "HEC-RAS", "ASC 606", "ISO 9001", "Civil 3D", "NetSuite", "qPCR", "LSCSW"
  var ORM_CODE = /(?<![A-Za-z0-9])((?:[A-Z]{3,}[a-z]?|[A-Z]{2}[0-9][A-Za-z0-9]*|[A-Z][a-z]+[A-Z][A-Za-z0-9]*|[a-z]{1,3}[A-Z][A-Za-z0-9]*|[A-Z][A-Za-z]*[0-9][A-Za-z0-9]*)(?:[-\/&+][A-Za-z0-9]+)*(?:\s[0-9]{2,5}[A-Za-z]?)?|[A-Z]{2}-[A-Z0-9]+|[A-Z][a-z]+\s[0-9][A-Z])(?![A-Za-z0-9])/g;
  // a product name in parentheses or after "in / with / using": "(Diligent, BoardEffect)", "analysis in FlowJo", "experience with Epic"
  var ORM_PAREN = /\(([^()]{2,120})\)/g;
  var ORM_PROPER = /(?<![A-Za-z0-9])[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?(?![A-Za-z0-9])/g;
  var ORM_PAREN_LIST = /,|\sor\s|\sand\s|\//, ORM_PAREN_CODE = /(?<![A-Za-z0-9])([A-Z][a-z]+[A-Z][A-Za-z0-9]*|[A-Z]{3,})(?![A-Za-z0-9])/;
  var ORM_PAREN_STOP = ['required', 'preferred', 'optional', 'remote', 'hybrid', 'onsite', 'contract', 'temporary', 'full', 'part', 'time', 'plus', 'bonus', 'nice', 'must', 'none', 'other', 'etc', 'including', 'such', 'example', 'see', 'note', 'yes', 'and', 'or', 'with', 'the', 'for', 'level', 'senior', 'junior', 'lead', 'basic', 'advanced', 'expert', 'strong', 'preferred'];
  var ORM_PREP_PROPER = /(?<![A-Za-z])(?:with|using|via)\s+([A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?)(?![A-Za-z0-9])/g;
  var ORM_CODE_STOP = ['usa', 'eeo', 'eoe', 'pto', 'ceo', 'cfo', 'coo', 'cto', 'cmo', 'cio', 'cpo', 'svp', 'evp', 'avp', 'iii', 'faq', 'llc', 'inc', 'ltd', 'corp', 'asap', 'tbd', 'ada', 'fmla', '401k', '403b', 'kpi', 'kpis', 'roi', 'eod', 'pdf', 'mba', 'phd', 'gpa', 'ged', 'dei', 'nyc', 'est', 'cst', 'pst', 'mst', 'edt', 'pdt', 'cdt', 'mdt', 'hsa', 'fsa', 'ppo', 'hmo', 'hdhp', 'ote', 'doe', 'w2', 'usd', 'ssn', 'and', 'the', 'for', 'our', 'you', 'all', 'new', 'job', 'one', 'two', 'its', 'now', 'per', 'ii', 'iv', 'afb', 'afs', 'nas'];
  var ORM_CODE_SKIP = /(days (a|per) week|in[- ]office|on[- ]site|onsite|hybrid|remote|located|location|commute|parking|relocat|headquarter|campus|neighborhood|downtown|office (in|at|on|near))/;
  var ORM_SKIP = /(equal (employment )?opportunity|without regard to|reasonable accommodation|e-verify|affirmative action|pay range|salary range|base salary|compensation|benefits|401\(k\)|paid time off|health insurance|visa|sponsor|authorized to work|work authorization|background check|drug (test|screen)|\$\s?[0-9])/;
  function ormKey(t) { var k = lc(t).replace(/[^a-z0-9]+/g, ''); if (/[A-Z0-9]s$/.test(t.replace(/\s/g, '')) && /^[A-Z]/.test(t)) k = k.replace(/s$/, ''); return k; }
  function ormCollect(acc, text, low, hits, imp, skip) {
    if (ORM_SKIP.test(low)) return;
    var I = idx(), m, taken = [];
    var inHit = function (a, b) { for (var q = 0; q < hits.length; q++) { if (a < hits[q].end && b > hits[q].at) return true; } return false; };
    var letters = text.replace(/[^A-Za-z]/g, ''), uppers = text.replace(/[^A-Z]/g, '');
    var shouting = letters.length >= 12 && uppers.length / letters.length > 0.6;
    var addCode = function (raw, at, end, named) {
      var k = ormKey(raw);
      if (k.length < 3 || /^[0-9]+$/.test(k) || ORM_CODE_STOP.indexOf(k) !== -1 || placeTok(k) || placeTok(vStem(k)) || own(skip, k) || (raw.length === 2 && own(TAX.us_states, raw))) return;
      if (!named && (vocabWeight(k) === 0 || vocabWeight(vStem(k)) === 0)) return;
      if (/\s(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|square|plaza|park)$/i.test(raw)) return;
      if (inHit(at, end)) return;
      taken.push([at, end]);
      var cur = own(acc.codes, k);
      if (!cur) { acc.codes[k] = { t: raw, imp: imp }; acc.codeOrder.push(k); }
      else if (IMP_RANK[imp] > IMP_RANK[cur.imp]) cur.imp = imp;
    };
    if (!shouting && !ORM_CODE_SKIP.test(low) && text.split(/\s+/).length > 2) {
      ORM_CODE.lastIndex = 0;
      while ((m = ORM_CODE.exec(text)) !== null) addCode(m[1].replace(/\s+/g, ' '), m.index, m.index + m[1].length, false);
      ORM_PAREN.lastIndex = 0;
      while ((m = ORM_PAREN.exec(text)) !== null) {
        // a list of product names ("Diligent, BoardEffect"): an ordinary word written as a name is a name there
        var inner = m[1], base = m.index + 1, pm, named = ORM_PAREN_LIST.test(inner) && ORM_PAREN_CODE.test(inner) && !/(?<![A-Za-z])(AFB|AFS|NAS|JB)(?![A-Za-z])/.test(inner);
        ORM_PROPER.lastIndex = 0;
        while ((pm = ORM_PROPER.exec(inner)) !== null) {
          var fw = lc(pm[0]).split(' ')[0];
          if (placeTok(fw)) continue;
          if (vocabWeight(fw) >= 1) addCode(pm[0], base + pm.index, base + pm.index + pm[0].length, false);
          else if (named && ORM_PAREN_STOP.indexOf(fw) === -1) addCode(pm[0], base + pm.index, base + pm.index + pm[0].length, true);
        }
      }
      ORM_PREP_PROPER.lastIndex = 0;
      while ((m = ORM_PREP_PROPER.exec(text)) !== null) {
        var pn = m[1], pat = m.index + m[0].length - pn.length;
        if (vocabWeight(lc(pn).split(' ')[0]) >= 1 && !placeTok(lc(pn).split(' ')[0])) addCode(pn, pat, pat + pn.length, false);
      }
    }
    // ordinary words, outside what the taxonomy and the codes already read
    var chars = low.split('');
    hits.forEach(function (h) { for (var c = h.at; c < h.end && c < chars.length; c++) chars[c] = ' '; });
    taken.forEach(function (sp) { for (var c = sp[0]; c < sp[1] && c < chars.length; c++) chars[c] = ' '; });
    chars.join('').split(/[^a-z0-9]+/).forEach(function (w) {
      if (w.length < 3 || /^[0-9]+$/.test(w) || placeTok(w) || own(skip, w)) return;
      var st = vStem(w), wt = vocabWeight(w);
      if (st !== w && placeTok(st)) return;
      if (wt === 1 && st !== w) wt = vocabWeight(st);
      if (!wt) return;
      var cur = own(acc.toks, st);
      if (!cur) { acc.toks[st] = { w: wt, imp: imp, t: w }; acc.tokOrder.push(st); }
      else if (IMP_RANK[imp] > IMP_RANK[cur.imp]) cur.imp = imp;
    });
  }
  var IMP_RANK = { pref: 1, req: 2, 'req!': 3 };
  function ormFinish(acc, hasExplicit) {
    var terms = acc.codeOrder.map(function (k) { var c = acc.codes[k]; return { key: k, name: c.t, required: c.imp === 'req!' || (c.imp === 'req' && !hasExplicit) }; });
    var vocab = acc.tokOrder.map(function (k) { var c = acc.toks[k]; var f = c.imp === 'req!' ? 1 : (c.imp === 'req' ? (hasExplicit ? 0.5 : 0.8) : 0.5); return { stem: k, word: c.t, w: Math.floor(c.w * f * 100 + 0.5) / 100 }; });
    return { terms: terms.slice(0, 40), vocab: vocab.slice(0, 160) };
  }
  // your side: every word and code your skills and resume use (joined pairs catch "HEC RAS" ~ "HEC-RAS", "Civil 3D" ~ "civil3d")
  function ormCandidate(units) {
    var keys = dict(), stems = dict();
    units.forEach(function (u) {
      var lvl = u.proven ? 2 : 1;
      var toks = lc(u.text).split(/[^a-z0-9]+/).filter(Boolean);
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i], k1 = t, k2 = i + 1 < toks.length ? t + toks[i + 1] : null, k3 = i + 2 < toks.length ? t + toks[i + 1] + toks[i + 2] : null;
        [k1, k2, k3, vStem(t)].forEach(function (k) { if (k && (own(keys, k) || 0) < lvl) keys[k] = lvl; });
        if (t.length >= 3) { var st = vStem(t); if ((own(stems, st) || 0) < lvl) stems[st] = lvl; }
      }
    });
    return { keys: keys, stems: stems };
  }
  // a bare title ("Staff Engineer", "Engineer II", "Principal Engineer, Payments") names no field - the posting's own
  // words do: the role its duties and requirements name most often, when that role is the same kind of job
  // ("... engineer"), never the firm's self-description ("a water-resources consulting firm")
  var TITLE_HEAD = /(?<![a-z])(engineer|developer|scientist|analyst|designer|technician|technologist|specialist|coordinator|administrator|consultant|manager|nurse|therapist|counselor|accountant|architect|planner|associate|officer|representative|advisor|assistant|clinician|researcher)$/;
  var HEAD_FORMS = { engineer: ['engineer', 'engineering'], developer: ['developer', 'development'], scientist: ['scientist', 'science'], analyst: ['analyst', 'analytics', 'analysis'],
    designer: ['designer', 'design'], technician: ['technician', 'tech'], technologist: ['technologist'], specialist: ['specialist'], coordinator: ['coordinator'],
    administrator: ['administrator', 'administration'], consultant: ['consultant', 'consulting'], manager: ['manager', 'management'], nurse: ['nurse', 'nursing'],
    therapist: ['therapist', 'therapy'], counselor: ['counselor', 'counseling'], accountant: ['accountant', 'accounting'], architect: ['architect'], planner: ['planner', 'planning'],
    associate: ['associate'], officer: ['officer'], representative: ['representative', 'rep'], advisor: ['advisor', 'adviser'], assistant: ['assistant'], clinician: ['clinician'],
    researcher: ['researcher', 'research'] };
  function headNounRoles(tMain, segs) {
    var hm = TITLE_HEAD.exec(lc(tMain).replace(/[\s,]+(i{1,3}|iv|[1-4])\s*$/, '').trim());
    if (!hm) return [];
    var I = idx(), forms = HEAD_FORMS[hm[1]], cnt = dict(), first = dict(), pat = dict(), order = [], m;
    for (var gi = 0; gi < segs.length; gi++) {
      var g = segs[gi];
      if (g.section === 'about' || g.section === 'benefits') continue;
      I.roleRe.lastIndex = 0;
      while ((m = I.roleRe.exec(g.low)) !== null) {
        var words = m[1].split(/[\s\/-]+/);
        if (forms.indexOf(words[words.length - 1]) === -1) continue;
        var rid = I.roleMap[m[1]];
        if (!cnt[rid]) { cnt[rid] = 0; first[rid] = [gi, m.index]; pat[rid] = m[1]; order.push(rid); }
        cnt[rid]++;
      }
    }
    var best = null;
    order.forEach(function (rid) {
      if (!best || cnt[rid] > cnt[best] || (cnt[rid] === cnt[best] && (first[rid][0] < first[best][0] || (first[rid][0] === first[best][0] && first[rid][1] < first[best][1])))) best = rid;
    });
    return best ? [{ id: best, name: I.role[best].name, pattern: pat[best], fromDescription: true }] : [];
  }
  // a title's main part, before its qualifier: "Data Analyst - Marketing", "Manager, Engineering", "Engineer (Rust)"
  var TITLE_QUAL = /\s+[-–—|]\s+|:\s+|\s*\(|,\s+/;
  function titleMain(t) { var m = TITLE_QUAL.exec(str(t)); return m && m.index > 0 ? str(t).slice(0, m.index) : str(t); }
  function parseJob(listing) {
    var I = idx();
    var n = normalizeListing(listing);
    var segs = segments(n.description, n.org);
    // every mention of every skill, with how strongly the posting asks for it
    var occ = {}, order = [], hasExplicit = false, orgLow = lc(n.org).trim(), ormAcc = { codes: dict(), codeOrder: [], toks: dict(), tokOrder: [] };
    // the company's own name and the title's initials ("our EBP") are not requirements
    var ormSkip = dict(), orgW = orgLow.split(/[^a-z0-9]+/).filter(Boolean), tInit = lc(titleMain(n.title)).split(/[^a-z]+/).filter(function (w) { return w.length > 1 && ['of', 'and', 'the', 'to', 'for', 'in'].indexOf(w) === -1; }).map(function (w) { return w.charAt(0); }).join('');
    if (orgW.length && orgW[0].length >= 4) ormSkip[orgW[0]] = 1;
    if (tInit.length >= 2) ormSkip[tInit] = 1;
    for (var i = 0; i < segs.length; i++) {
      var imp = segImportance(segs[i]);
      if (!imp) continue;
      var segText = maskOrg(segs[i].text, orgLow);
      var hits = findSkills(segText);
      var segLow = segText === segs[i].text ? segs[i].low : lc(segText);
      ormCollect(ormAcc, segText, segLow, hits, imp, ormSkip);
      if (!hits.length) continue;
      // "partner with product and customer success" names teams, not skills you need
      if (COLLAB_ANY.test(segLow)) { hits = hits.filter(function (x) { return !(TEAM_ALIAS.test(segLow.slice(x.at, x.end)) && COLLAB_BEFORE.test(segLow.slice(h0(x.at - 80), x.at))); }); if (!hits.length) continue; }
      // "support our supply chain teams" names a team, not a skill you need
      hits = hits.filter(function (x) { return !(TEAM_ALIAS.test(segLow.slice(x.at, x.end)) && TEAM_AFTER.test(segLow.slice(x.end, x.end + 30))); });
      if (!hits.length) continue;
      var dsp = degreeSpans(segLow);
      if (dsp.length) { hits = hits.filter(function (x) { return !dsp.some(function (d) { return x.at >= d[0] && x.at < d[1]; }); }); if (!hits.length) continue; }
      hits = hits.filter(function (x) { return !COMPLIANT_SETUP.test(segLow.slice(x.end, x.end + 60)); });
      if (!hits.length) continue;
      var certSoft = CERT_SOFT.test(segLow);
      var fl = orFlags(segLow, hits), ev = trunc(segs[i].text, 170);
      // duties only stop counting as the bar when a real requirements section names skills
      if (!hasExplicit && imp === 'req!' && segs[i].section === 'req' && hits.some(function (x) { return I.skill[x.id].kind !== 'soft'; })) hasExplicit = true;
      var gid = 'g' + i, gIds = {}, gHits = 0;
      for (var a = 0; a < hits.length; a++) if (fl[a]) { gIds[hits[a].id] = 1; gHits++; }
      var gKind = Object.keys(gIds).length >= 2 ? 'anyof' : (gHits >= 2 ? 'none' : (gHits === 1 ? 'alt' : 'none'));
      for (var h = 0; h < hits.length; h++) {
        var id = hits[h].id, o = { imp: imp, group: null, ev: ev };
        if (fl[h] && gKind === 'anyof') o.group = gid;
        else if (fl[h] && gKind === 'alt' && orGeneric(segLow, hits[h])) o.imp = 'pref';
        if (GROWTH_BEFORE.test(segLow.slice(h0(hits[h].at - 60), hits[h].at))) continue;
        if (o.imp !== 'pref' && INTEREST_BEFORE.test(segLow.slice(h0(hits[h].at - 60), hits[h].at))) o.imp = 'pref';
        if (o.imp !== 'pref' && certSoft && I.skill[id].kind === 'cert') o.imp = 'pref';
        if (!occ[id]) { occ[id] = []; order.push(id); }
        occ[id].push(o);
      }
    }
    var bySkill = {};
    order.forEach(function (id) {
      var os = occ[id], pick = null, required = true;
      var f = function (pred) { for (var q = 0; q < os.length; q++) if (pred(os[q])) return os[q]; return null; };
      if ((pick = f(function (o) { return o.imp === 'req!' && !o.group; }))) required = true;
      else if ((pick = f(function (o) { return o.imp === 'req!' && o.group; }))) required = true;
      else if ((pick = f(function (o) { return o.imp === 'pref'; }))) required = false;
      else if ((pick = f(function (o) { return o.imp === 'req' && !o.group; }))) required = true;
      else { pick = os[0]; required = true; }
      // a tool named only in "what you'll do" is part of the job, not the bar
      // to get it - when the posting spells out its requirements, read those
      var implied = pick.imp === 'req' && hasExplicit;
      if (implied) required = false;
      bySkill[id] = { id: id, required: required, implied: implied, group: pick.group, evidence: pick.ev, from: 'posting' };
    });
    // a "group" left with one member was a choice between this and something
    // already covered - it is optional, not a requirement on its own
    var gCount = {};
    order.forEach(function (id) { var g = bySkill[id].group; if (g && I.skill[id].kind !== 'soft') gCount[g] = (gCount[g] || 0) + 1; });
    order.forEach(function (id) { var b = bySkill[id]; if (b.group && (gCount[b.group] || 0) < 2) { b.group = null; b.required = false; } });
    // the title itself is a requirement source ("Python Developer"). Skills the title offers as
    // alternatives ("Ruby or Python Developer", "Python/Go Engineer") are ONE either-or
    // requirement - unless the posting itself requires each of them separately
    var th = findSkills(n.title);
    var thIds = uniq(th.map(function (x) { return x.id; }).filter(function (id) { return I.skill[id].kind !== 'soft'; }));
    var tLow = lc(n.title), titleGroup = null;
    if (thIds.length >= 2) {
      var orWord = /(?<![a-z])(or|and\/or)(?![a-z])/.test(tLow), slash = /[a-z0-9+#)]\s*\/\s*[a-z(]/.test(tLow);
      var eachReq = thIds.every(function (id) { return !!bySkill[id] && bySkill[id].required && !bySkill[id].group; });
      if (orWord || (slash && !eachReq)) {
        var dg = thIds.map(function (id) { return bySkill[id] ? bySkill[id].group : null; }).filter(function (g) { return !!g; });
        titleGroup = dg.length ? dg[0] : 'title';
      }
    }
    // ...but the posting has the last word: "logistics knowledge is a plus" stays a plus, and a business
    // domain in the title's qualifier ("Data Science Intern - Credit Risk") names the team, not the core skill
    var tMain = titleMain(n.title), tMainLow = lc(tMain);
    th.forEach(function (x) {
      var grp = titleGroup && thIds.indexOf(x.id) !== -1 ? titleGroup : null, b = bySkill[x.id];
      if (b && !b.required && !b.implied) return;
      var onlyQual = findSkills(tMain).every(function (y) { return y.id !== x.id; });
      if (onlyQual && !(b && b.required) && (I.skill[x.id].domain || I.skill[x.id].kind === 'cert' || QUAL_SOFT.test(lc(str(n.title).slice(tMain.length))))) {
        if (!b) { bySkill[x.id] = { id: x.id, required: false, implied: false, group: null, evidence: 'In the job title: ' + n.title, from: 'title' }; order.push(x.id); }
        return;
      }
      if (!b) { bySkill[x.id] = { id: x.id, required: true, implied: false, group: grp, evidence: 'In the job title: ' + n.title, from: 'title' }; order.push(x.id); } else { b.required = true; b.implied = false; b.group = grp; }
    });
    // legacy / extracted tags
    n.tags.forEach(function (tag) {
      findSkills(tag).forEach(function (x) { if (!bySkill[x.id]) { bySkill[x.id] = { id: x.id, required: true, implied: false, group: null, evidence: 'Listed as a key skill: ' + tag, from: 'tag' }; order.push(x.id); } });
    });
    var skills = [], soft = [];
    order.forEach(function (id) {
      var sk = I.skill[id], b = bySkill[id];
      if (sk.kind === 'soft') { soft.push(sk.name); return; }
      skills.push({ id: id, name: sk.name, kind: sk.kind, family: sk.family || null, required: b.required, implied: !!b.implied, group: b.group, evidence: b.evidence, from: b.from });
    });
    skills.sort(function (a, b) { return (a.required === b.required ? 0 : (a.required ? -1 : 1)); });
    var years = parseYears(segs);
    var tl = titleLevel(n.title);
    var level = tl, levelSource = tl != null ? 'title' : null;
    // "Associate HR Business Partner ... 3+ years": a junior-sounding title doesn't beat the posting's own years floor
    if (tl != null && tl <= 1 && years && !years.pref && years.min >= 3) { var lfy = levelFromYears(years.min); if (lfy > tl) { level = lfy; levelSource = 'years'; } }
    if (level == null && years && !years.pref) { level = levelFromYears(years.min); levelSource = 'years'; }
    if (level == null && (n.type === 'internship')) { level = 0; levelSource = 'type'; }
    var et = parseEmploymentType(n, segs);
    if (level == null && et.type === 'internship') { level = 0; levelSource = 'type'; }
    if (level == null) {
      for (var ng = 0; ng < segs.length; ng++) { if (segs[ng].section !== 'about' && NEWGRAD_RE.test(segs[ng].low)) { level = 1; levelSource = 'description'; break; } }
    }
    var salary = parseSalary(n, segs);
    // no level stated anywhere: modest pay is the clearest remaining signal
    if (level == null && salary.source != null && salary.source !== 'estimated' && salary.annualMax != null && (salary.period === 'hour' ? salary.max <= 30 : salary.annualMax <= 52000)) { level = 1; levelSource = 'pay'; }
    var modeInfo = parseMode(n.location, segs);
    var places = parsePlaces(n.location);
    if (modeInfo.mode == null && places.length) { modeInfo.mode = 'onsite'; modeInfo.source = 'inferred'; }
    // the role is what the title's main part names: "Inside Sales AE - Logistics Software" is a sales job
    var roles = findRoles(tMain);
    if (!roles.length) roles = findRoles(n.title);
    if (!roles.length) roles = headNounRoles(tMain, segs);
    if (!roles.length) {
      var intro = segs.filter(function (g) { return g.section !== 'about' && HIRE_CUE.test(g.low); }).slice(0, 2).map(function (g) { return g.low; }).join(' ');
      roles = findRoles(intro).slice(0, 1).map(function (r) { r.fromDescription = true; return r; });
    }
    var job = {
      id: n.id, title: n.title, org: n.org, type: n.type, location: n.location, description: n.description,
      applyUrl: n.applyUrl, source: n.source, deadline: n.deadline, tags: n.tags,
      postedAt: n.postedAt, firstSeenAt: n.firstSeenAt, lastSeenAt: n.lastSeenAt, seenCount: n.seenCount, repostCount: n.repostCount,
      roles: roles,
      skills: skills, soft: uniq(soft), orm: ormFinish(ormAcc, hasExplicit),
      yearsMin: years ? years.min : null, yearsMax: years ? years.max : null, yearsText: years ? years.text : '', yearsPreferred: years ? years.pref : false, yearsAlt: years && years.alt ? years.alt : null,
      level: level, levelSource: levelSource, levelLabel: levelLabel(level),
      education: parseEducation(segs),
      mode: modeInfo.mode, modeSource: modeInfo.source, remoteRegion: modeInfo.region, places: places,
      employmentType: et.type, employmentTypeSource: et.source,
      auth: parseAuth(segs),
      salary: salary,
      mgmt: parseMgmt(segs),
      enroll: parseEnroll(segs, n.title),
      remoteLimit: parseRemoteLimit(segs, n.location),
      license: parseLicense(segs),
      travel: parseTravel(segs),
      industries: parseIndustries(n, segs),
      agency: parseAgency(n, segs),
      evergreen: parseEvergreen(n, segs),
      richness: { descChars: n.description.replace(/\s+/g, ' ').trim().length, segments: segs.length, sectioned: segs.some(function (g) { return g.section !== 'none'; }) },
    };
    job.canonicalKey = canonicalKey(job);
    return job;
  }

  /* ------------------------------------------------------- candidate side */
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  var SEASONS = { spring: 3, summer: 6, fall: 9, autumn: 9, winter: 12 };
  function parseMonth(s, nowMs) {
    var t = lc(s).trim().replace(/^(expected|anticipated|est\.?|exp\.?|graduating|graduation|class of)\s*:?\s*/, '');
    if (!t) return null;
    if (/^(present|current|now|today|ongoing)/.test(t)) { var d = new Date(nowMs); return d.getUTCFullYear() * 12 + d.getUTCMonth() + 1; }
    var m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})/))) return parseInt(m[1], 10) * 12 + parseInt(m[2], 10);
    if ((m = t.match(/^(\d{1,2})\/(\d{4})/))) return parseInt(m[2], 10) * 12 + parseInt(m[1], 10);
    if ((m = t.match(/^([a-z]+)\.?\s*'?(\d{4}|\d{2})/))) {
      var y = parseInt(m[2], 10); if (y < 100) y += 2000;
      var key = m[1].slice(0, 4) === 'sept' ? 'sept' : m[1].slice(0, 3);
      if (own(MONTHS, key)) return y * 12 + MONTHS[key];
      if (own(SEASONS, m[1])) return y * 12 + SEASONS[m[1]];
      return null;
    }
    if ((m = t.match(/^(\d{4})$/))) return parseInt(m[1], 10) * 12 + 1;
    return null;
  }
  var EDU_ENTRY = [
    [4, /(?<![a-z])(ph\.?d|doctor of|doctorate)(?![a-z])/],
    [3, /(?<![a-z])(master|m\.s\.|m\.a\.|ms in|ma in|mba|m\.eng|meng|mph|msc|m\.ed|msn|msw|mfa|m\.f\.a)(?![a-z])/],
    [2, /(?<![a-z])(bachelor|b\.s\.|b\.a\.|bs in|ba in|bs,|ba,|b\.eng|bsc|bba|bfa|b\.f\.a|bsn|undergraduate|b\.s|b\.a)(?![a-z])/],
    [1, /(?<![a-z])(associate of|associate's|associate degree|a\.a\.|a\.s\.)(?![a-z])/],
    [0, /(?<![a-z])(high school|ged|diploma)(?![a-z])/],
  ];
  // the short forms are only safe at the start of an education TITLE ("BS Statistics", "MS Computer Science")
  var EDU_TITLE_SHORT = [[3, /^(ms|ma|msc|mfa|meng|mph)\s+[a-z]/], [2, /^(bs|ba|bsc|bfa|bba|beng)\s+[a-z]/]];
  function eduLevelOf(text, title) {
    var t = lc(text);
    for (var i = 0; i < EDU_ENTRY.length; i++) { if (EDU_ENTRY[i][1].test(t)) return EDU_ENTRY[i][0]; }
    var tt = lc(title).trim();
    for (var j = 0; j < EDU_TITLE_SHORT.length; j++) { if (EDU_TITLE_SHORT[j][1].test(tt)) return EDU_TITLE_SHORT[j][0]; }
    return null;
  }

  function exactSkill(item, ctxLow) {
    var I = idx(), t = lc(item).trim(), found = [];
    if (!t || t.length > 30) return null;
    for (var i = 0; i < TAX.skills.length; i++) {
      var sk = TAX.skills[i];
      // "list" names only count as a skill when typed alone in a skills list ("analytics")
      if ((sk.cs || []).concat(sk.list || []).some(function (c) { return lc(c) === t; })) found.push(sk);
    }
    if (!found.length) return null;
    // "DBT" alone in a list of therapies is the therapy, in a list of data tools the data tool
    if (found.length > 1 && ctxLow) {
      for (var f = 0; f < found.length; f++) { if ((found[f].ctx || []).some(function (c) { return c !== t && hasWord(ctxLow, c); })) return found[f].id; }
    }
    return found[0].id;
  }
  function resumeIndustries(text) {
    // a work entry's own words: one clear industry keyword is enough here
    var low = lc(text), out = [];
    TAX.industries.forEach(function (d) { if (d.keywords.some(function (k) { return hasWord(low, k); })) out.push(d.id); });
    return out;
  }
  var GOAL_REL = /\s(who|that|which|where|whose)\s/;
  var GOAL_NEG = /(?<![a-z])((do not|don't|dont|not|never|no longer|won't|will not)\s+(want|interested|looking|pursue|pursuing|considering|consider|going back|go back|return)|away from|anything but|rather than|instead of|avoid|avoiding|steer clear of|stay away from|no more|not another)(?![a-z])/;
  var GOAL_NEG_G = new RegExp(GOAL_NEG.source, 'g');
  var GOAL_PIVOT = /(?<![a-z])(but|so|instead|rather|i want|i'd like|i would like|i'm looking|i am looking|looking for|hoping|hope to|aiming|aim to|moving (in)?to|move (in)?to|transition(ing)? (in)?to|switch(ing)? (in)?to|pivot(ing)? (in)?to|focus(ing)? on|ideally|prefer|more like|something like|more of)(?![a-z])/;
  var GOAL_FROM = /(?<![a-z])(from|out of|leave|leaving|after|beyond)\s+([a-z0-9 &\/,'-]{2,60}?)\s+(to|into|toward|towards|for)(?![a-z])/;
  function goalRoles(text) {
    // "move from teaching into instructional design" -> the target is the
    // second half; a role named only in the "from" part is where they are now
    var low = lc(text), from = GOAL_FROM.exec(low), roles = findRoles(text);
    // "a clinical nurse educator who trains new nurses": roles named after "who" are the work, not the goal
    var rel = GOAL_REL.exec(low);
    if (rel && roles.length > 1) {
      var I0 = idx(), m0, firstAt = {};
      I0.roleRe.lastIndex = 0;
      while ((m0 = I0.roleRe.exec(low)) !== null) { var rid0 = I0.roleMap[m0[1]]; if (firstAt[rid0] == null) firstAt[rid0] = m0.index; }
      var before = roles.filter(function (r) { return firstAt[r.id] != null && firstAt[r.id] < rel.index; });
      if (before.length) roles = before;
    }
    // a role the goal rules out ("I do not want a quota-carrying sales role", "away from sales") is no target
    var I1 = idx(), m1, negd = {}, pos = {};
    I1.roleRe.lastIndex = 0;
    while ((m1 = I1.roleRe.exec(low)) !== null) {
      var rid1 = I1.roleMap[m1[1]], cs1 = Math.max(low.lastIndexOf('.', m1.index), low.lastIndexOf(';', m1.index), low.lastIndexOf('!', m1.index), low.lastIndexOf('?', m1.index)) + 1;
      var win1 = low.slice(Math.max(cs1, m1.index - 200), m1.index), mn, negEnd = -1;
      GOAL_NEG_G.lastIndex = 0;
      while ((mn = GOAL_NEG_G.exec(win1)) !== null) negEnd = mn.index + mn[0].length;
      if (negEnd >= 0 && !GOAL_PIVOT.test(win1.slice(negEnd))) negd[rid1] = true; else pos[rid1] = true;
    }
    var keptN = roles.filter(function (r) { return !(negd[r.id] && !pos[r.id]); });
    if (keptN.length) roles = keptN;
    if (!from) return roles;
    var fs = from.index, fe = from.index + from[0].length;
    var I = idx(), m, inFrom = {};
    I.roleRe.lastIndex = 0;
    while ((m = I.roleRe.exec(low)) !== null) { if (m.index >= fs && m.index + m[1].length <= fe) inFrom[I.roleMap[m[1]]] = (inFrom[I.roleMap[m[1]]] || 0) + 1; else inFrom[I.roleMap[m[1]]] = -999; }
    var kept = roles.filter(function (r) { return !(inFrom[r.id] > 0); });
    return kept.length ? kept : roles;
  }
  function splitSkillList(s) { return str(s).split(/[,;\n|]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  var BOARD_STATE = /^(?:the\s+)?([a-z]+(?: [a-z]+)?)(?: state)? (board|committee|department|division|commission|bureau|office)(?![a-z])/;
  function lowPrior(level) { return level === 'proven' ? 2 : (level === 'stated' ? 1 : 0); }
  // a credential's status: one that lapsed is not held (it covers its whole certification entry); one you're
  // still working toward ("eligible to sit for the PE exam", "CPA - in progress") counts for nothing on that line
  var CRED_LAPSED = /(?<![a-z])(lapsed|expired|inactive|not active|no longer active|did not (renew|recertify)|not renewed|not current)(?![a-z])/;
  var CRED_FUTURE = /(?<![a-z])(in progress|pending|application submitted|applied for|applying for|awaiting|not (yet )?issued|under review|in process|planning to (sit|take|test)|scheduled to (sit|take|test)|preparing for|studying for|candidates?|candidacy|eligible to (sit|take|test)|eligible for (the )?(exam|licensure|license|certification)|not (yet )?(a )?licensed|not yet (certified|licensed|earned)|(will|to) (sit|test) for|exam scheduled|working toward|working towards|in pursuit of|passed \d+ (of|out of) \d+|\d+ (of|out of) \d+ (sections|parts|exams)|sections? (passed|remaining|left))(?![a-z])/;
  // a license still being applied for: its state is not yours yet
  var CRED_PENDING = /(?<![a-z])(pending|application submitted|applied for|applying for|awaiting|not (yet )?issued|under review|in process|in progress)(?![a-z])/;
  // "CPA Exam", "PE exam": an exam on the way to a license is not the license
  var CRED_EXAM_AFTER = /^[\s-]*(exam|examination|candidate|candidates|review|course|prep|eligible|eligibility|track)(?![a-z])/;
  var CONTRACT_TITLE = /(?<![a-z])(contract|contractor|contract-to-hire|temporary|temp|freelance|freelancer|self-employed|independent consultant|per diem|prn|seasonal|locum|locums|travel nurse|traveling nurse)(?![a-z])/;
  var CONTRACT_DESC = /(?<![a-z])(contract (role|position|assignment|basis|engagement)|on contract|as a contractor|freelance|self-employed|temporary (role|position|assignment)|temp (role|assignment)|per diem)(?![a-z])/;
  var CITIZEN_TXT = /(?<![a-z])(u\.?\s?s\.? citizen|united states citizen|american citizen)(?![a-z])/g;
  var NOT_CITIZEN_BEFORE = /(not|non|no|without|pending|applying for|eligible for|seeking|future)[\s-]*(a\s+|an\s+)?$/;
  function spanMonths(list) { var tot = 0, cs = null, ce = null; list.forEach(function (x) { if (cs == null) { cs = x.s; ce = x.e; } else if (x.s <= ce + 1) { if (x.e > ce) ce = x.e; } else { tot += ce - cs + 1; cs = x.s; ce = x.e; } }); if (cs != null) tot += ce - cs + 1; return tot; }

  function buildCandidate(profile, entries, prefs, nowMs) {
    var I = idx();
    profile = profile || {}; entries = Array.isArray(entries) ? entries : []; prefs = prefs || {};
    var skills = {}, custom = [];
    function addSkill(id, level, evidence, source, via) {
      var cur = skills[id];
      if (!cur || lowPrior(level) > lowPrior(cur.level)) skills[id] = { id: id, name: I.skill[id].name, level: level, evidence: evidence, source: source, via: via || null };
    }
    // stated: the skills field (and any explicit extra skills from the search profile)
    var skillText = str(profile.skills) + (prefs.extraSkills && prefs.extraSkills.length ? ', ' + prefs.extraSkills.join(', ') : '');
    splitSkillList(skillText).forEach(function (item) {
      var hits = findSkills(item);
      if (!hits.length) {
        // a bare "R", "Go" or "BLS" in a skills LIST is unambiguous - the context
        // checks that guard prose don't apply to an item someone typed as a skill
        var exact = exactSkill(item, lc(skillText));
        if (exact) hits = [{ id: exact }];
      }
      if (!hits.length) { if (item.length >= 2 && item.length <= 40) custom.push(item); return; }
      var notHeld = CRED_LAPSED.test(lc(item)) || CRED_FUTURE.test(lc(item));
      hits.forEach(function (h) { if (notHeld && I.skill[h.id].kind === 'cert') return; if (I.skill[h.id].license && h.end != null && CRED_EXAM_AFTER.test(lc(item).slice(h.end, h.end + 24))) return; addSkill(h.id, 'stated', 'Listed in your skills: "' + trunc(item, 60) + '"', 'skills'); });
    });
    // proven: used in a real resume entry (title or description line)
    var ormUnits = [{ text: skillText, proven: false }];
    // "U.S. citizen" written in the profile (and not "not a U.S. citizen")
    var citizenTxt = false;
    [skillText, str(profile.northstar), str(profile.finalidea || profile.final_idea)].concat(entries.map(function (e) { return e && typeof e === 'object' ? str(e.title) + ' ' + str(e.raw_description || e.description || e.bullets || '') : ''; })).forEach(function (tx) {
      var lt = lc(tx), cm2; CITIZEN_TXT.lastIndex = 0;
      while ((cm2 = CITIZEN_TXT.exec(lt)) !== null) { if (!NOT_CITIZEN_BEFORE.test(lt.slice(h0(cm2.index - 24), cm2.index))) citizenTxt = true; }
    });
    var permanentNow = false, workMonths = [], heldTitles = [], jobsHeld = [], edu = null, inds = Object.create(null), indOrder = [], school = [], gradAt = null, mgmt = null, licStates = [], licCompact = false;
    licenseStates(str(profile.skills)).forEach(function (c) { if (licStates.indexOf(c) === -1) licStates.push(c); });
    if (/(compact|multistate|multi-state)/.test(lc(profile.skills)) && LIC_WORD.test(lc(profile.skills))) licCompact = true;
    // a security clearance you hold, read from your skills and resume (the highest level stated)
    var clr = 0, clrFrom = '';
    splitSkillList(profile.skills).forEach(function (item) { var lv = candClearance(item); if (lv > clr) { clr = lv; clrFrom = 'Listed in your skills: "' + trunc(item, 60) + '"'; } });
    var nowM = parseMonth('present', nowMs);
    entries.forEach(function (e) {
      if (!e || typeof e !== 'object') return;
      var et = lc(e.entry_type || e.type || 'work');
      var title = str(e.title), org = str(e.org), desc = str(e.raw_description || e.description || e.bullets || '');
      var label = trunc(title + (org ? ' @ ' + org : ''), 60);
      if (et === 'education') {
        var el = eduLevelOf(title + ' ' + desc, title);
        var endM = parseMonth(e.end_date || e.endDate || '', nowMs), startM = parseMonth(e.start_date || e.startDate || '', nowMs);
        if (el != null) {
          var inProg = /expected|candidate|in progress|anticipated|pursuing/.test(lc(title + ' ' + desc + ' ' + str(e.end_date))) || (endM != null && endM > nowM);
          if (!edu) edu = { level: null, inProgress: null, text: '' };
          if (inProg) { if (edu.inProgress == null || el > edu.inProgress) edu.inProgress = el; }
          else if (edu.level == null || el > edu.level) { edu.level = el; edu.text = trunc(title, 60); }
          if (!edu.text) edu.text = trunc(title, 60);
          if (endM != null && (gradAt == null || endM > gradAt)) gradAt = endM;
          // jobs held while studying for a first degree were (almost always) part-time
          if (el <= 2 && startM != null && endM != null) school.push({ s: startM, e: endM });
        }
      }
      var lines = segments(title + '\n' + desc);
      ormUnits.push({ text: title + ' \n ' + org + ' \n ' + desc, proven: et === 'work' || et === 'job' || et === 'experience' || et === 'internship' || et === 'volunteer' || et === 'project' });
      var credEntry = /cert|licen|credential/.test(et), entryLapsed = credEntry && CRED_LAPSED.test(lc(title + ' ' + desc));
      var entryFuture = credEntry && CRED_PENDING.test(lc(title + ' ' + desc));
      if (credEntry && !entryLapsed && !entryFuture && LIC_WORD.test(lc(title))) { var bm = BOARD_STATE.exec(lc(org)); if (bm && I.stateByName[bm[1]] && licStates.indexOf(I.stateByName[bm[1]]) === -1) licStates.push(I.stateByName[bm[1]]); }
      lines.forEach(function (g) {
        // a bare keyword list ("Python, SQL, Tableau, dbt") pasted into an entry isn't proof of use
        var dump = et !== 'education' && g.text.split(/[,;|\/]/).length >= 4 && !ACTION_VERB.test(g.low);
        var lineNotHeld = entryLapsed || CRED_LAPSED.test(g.low) || CRED_FUTURE.test(g.low);
        findSkills(g.text).forEach(function (h) {
          if (I.skill[h.id].kind === 'soft') return;
          if (lineNotHeld && I.skill[h.id].kind === 'cert') return;
          if (I.skill[h.id].license && CRED_EXAM_AFTER.test(g.low.slice(h.end, h.end + 24))) return;
          if (et === 'education') addSkill(h.id, 'stated', 'From your education: "' + trunc(g.text, 110) + '"', label);
          else if (dump) addSkill(h.id, 'stated', 'Listed in your resume (not shown in use): "' + trunc(g.text, 100) + '"', label);
          else addSkill(h.id, 'proven', trunc(g.text, 140), label);
        });
        if (!mgmt && et !== 'education' && MGMT_DONE.test(g.low)) mgmt = { source: trunc(g.text, 120) };
        if (!entryLapsed && !entryFuture && !CRED_PENDING.test(g.low)) licenseStates(g.text).forEach(function (c) { if (licStates.indexOf(c) === -1) licStates.push(c); });
        if (/(compact|multistate|multi-state)/.test(g.low) && LIC_WORD.test(g.low)) licCompact = true;
        var clv = candClearance(g.text); if (clv > clr) { clr = clv; clrFrom = trunc(g.text, 100); }
      });
      if (et === 'work' || et === 'job' || et === 'experience' || et === 'internship' || et === 'volunteer') {
        resumeIndustries(org + ' \n ' + title + ' \n ' + desc).forEach(function (d) { if (!inds[d]) { inds[d] = label; indOrder.push(d); } });
        var s = parseMonth(e.start_date || e.startDate || '', nowMs), en = parseMonth(e.end_date || e.endDate || '', nowMs);
        if (s != null && en == null) en = nowM;   // a start date and no end date: the job you're in now
        var half = LV_INTERN.test(lc(title)) || et === 'internship' || et === 'volunteer' || PART_TIME.test(lc(title + ' ' + desc));
        if (s != null && en != null && en >= s) workMonths.push({ s: s, e: en, w: half ? 0.5 : 1, t: title });
        if (title) heldTitles.push(title);
        if (title && (et === 'work' || et === 'job' || et === 'experience')) jobsHeld.push({ t: title, s: s, e: en });
        // the job you're in now is a permanent one (not a contract, temp, freelance or part-time job)
        if ((et === 'work' || et === 'job' || et === 'experience') && s != null && en != null && en >= nowM && !half && !CONTRACT_TITLE.test(lc(title)) && !CONTRACT_DESC.test(lc(desc))) permanentNow = true;
        if (!mgmt && et !== 'internship' && PEOPLE_MGR_TITLE.test(lc(title)) && !NOT_PEOPLE_MGR.test(lc(title))) mgmt = { source: 'your title "' + trunc(title, 40) + '"' };
      }
    });
    workMonths.forEach(function (x) { if (x.w === 1 && school.some(function (sc) { return x.s >= sc.s && x.e <= sc.e + 1; })) x.w = 0.5; });
    // implied skills (pandas -> python, PostgreSQL -> SQL)
    Object.keys(skills).sort().forEach(function (id) {
      var sk = I.skill[id], c = skills[id];
      (sk.implies || []).forEach(function (t) {
        if (!skills[t] || lowPrior(c.level) > lowPrior(skills[t].level)) skills[t] = { id: t, name: I.skill[t].name, level: c.level, evidence: c.evidence, source: c.source, via: sk.name };
      });
    });
    // years of experience (overlaps merged; internships count half)
    var years = null, yearsSource = null;
    if (isNum(prefs.years)) { years = prefs.years; yearsSource = 'you set it'; }
    else if (workMonths.length) {
      workMonths.sort(function (a, b) { return a.s - b.s || a.e - b.e; });
      var full = workMonths.filter(function (x) { return x.w === 1; }), half = workMonths.filter(function (x) { return x.w !== 1; });
      var months = spanMonths(full) + spanMonths(half) * 0.5;
      years = round1(months / 12); yearsSource = 'from your resume dates';
    } else if (profile.stage === 'student' || profile.stage === 'grad') { years = 0; yearsSource = 'from your stage (' + profile.stage + ')'; }
    // level
    var level = null, levelSource = null;
    var st = profile.stage || '';
    if (st === 'student') { level = 0.5; levelSource = 'student'; }
    else if (st === 'grad') { level = 1; levelSource = 'recent graduate'; }
    else if (st === 'switch') {
      level = years != null && years >= 3 ? 1.5 : 1; levelSource = 'career switcher';
      // someone who has run teams elsewhere doesn't start over as a coordinator
      if (years != null && years >= 3 && heldTitles.some(function (t) { return LEADERSHIP_TITLE.test(lc(t)); })) { level = years >= 8 ? 3 : 2; levelSource = 'career switcher with leadership experience'; }
    }
    else if (st === 'working') { level = years != null ? levelFromYears(years) : 2; levelSource = years != null ? 'years of experience' : 'working professional'; }
    else if (years != null) { level = levelFromYears(years); levelSource = 'years of experience'; }
    // targets
    var roles = [];
    var explicit = Array.isArray(prefs.targetRoles) ? prefs.targetRoles.filter(function (r) { return I.role[r]; }) : [];
    explicit.forEach(function (r) { roles.push({ id: r, name: I.role[r].name, from: 'you chose it' }); });
    var goalText = str(profile.northstar) + ' ' + str(profile.finalidea || profile.final_idea);
    if (!roles.length) goalRoles(goalText).forEach(function (r) { roles.push({ id: r.id, name: r.name, from: 'your goal' }); });
    if (level != null && st === 'working') {
      // What you're titled NOW says more than a count of years. An older, more junior
      // title ("Audit Associate" four years ago) never pulls you down; it can only lift you.
      var related = function (t) { var tr = findRoles(t); return !roles.length || tr.some(function (x) { return roles.some(function (y) { return roleSim(x.id, y.id) >= 0.6; }); }); };
      var cur = null, key = function (j) { return [j.e != null ? j.e : -1, j.s != null ? j.s : -1]; };
      jobsHeld.forEach(function (j) { if (!cur) { cur = j; return; } var a = key(j), b = key(cur); if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) cur = j; });
      var curTL = cur ? titleLevel(cur.t) : null;
      if (cur && curTL != null && curTL !== 0 && related(cur.t)) {
        if (curTL < level - 1) { level = level - 1; levelSource = 'your title "' + trunc(cur.t, 40) + '" and your years'; }
        else { level = curTL; levelSource = 'your title "' + trunc(cur.t, 40) + '"'; }
      }
      else {
        var best = null, bestT = '';
        heldTitles.forEach(function (t) { var tl = titleLevel(t); if (tl == null || tl === 0 || !related(t)) return; if (best == null || tl > best) { best = tl; bestT = t; } });
        if (best != null && best > level) { level = best; levelSource = 'your title "' + trunc(bestT, 40) + '"'; }
      }
    }
    // the years you'd bring to the work you're aiming at - jobs in your target field or a close one - so years
    // waiting tables don't make an SDR "overqualified" for an AE role
    var relYears = null;
    if (years != null && yearsSource === 'from your resume dates' && roles.length) {
      var relW = workMonths.filter(function (x) { return x.t && findRoles(x.t).some(function (r) { return roles.some(function (y) { return roleSim(r.id, y.id) >= 0.45; }); }); });
      relYears = round1((spanMonths(relW.filter(function (x) { return x.w === 1; })) + spanMonths(relW.filter(function (x) { return x.w !== 1; })) * 0.5) / 12);
    }
    if (isNum(prefs.level)) { level = clamp(prefs.level, 0, 6); levelSource = 'you set it'; }
    if (prefs.education != null && isNum(prefs.education)) edu = { level: prefs.education, inProgress: null, text: 'you set it' };
    if (!edu) {
      if (st === 'student') edu = { level: 0, inProgress: 2, text: 'assumed from student stage', assumed: true };
      else if (st === 'grad') edu = { level: 2, inProgress: null, text: 'assumed from recent-graduate stage', assumed: true };
    }
    var loc = parseUserLocation(prefs.locations != null && str(prefs.locations).trim() ? prefs.locations : profile.loc);
    var goalTokens = uniq((lc(goalText).match(/[a-z][a-z+#.-]{2,}/g) || []).filter(function (w) { return GOAL_STOP.indexOf(w) === -1; }));
    // the level your goal names, when it's above where you are now ("Senior Accountant", "a staff engineer")
    var goalLevel = null;
    var gNorth = str(profile.northstar), gFm = GOAL_FROM.exec(lc(gNorth));
    var gTarget = lc(str(profile.finalidea || profile.final_idea).trim() || (gFm ? gNorth.slice(gFm.index + gFm[0].length) : gNorth));
    var gl = /(?<![a-z])(director|head of|vp|vice president)(?![a-z])/.test(gTarget) ? 5 : (/(?<![a-z])(principal|staff)\s+[a-z]/.test(gTarget) ? 4 : (/(?<![a-z])(senior|sr\.?)(?![a-z])/.test(gTarget) ? 3 : null));
    if (gl != null && level != null && gl > level && gl - level <= 1.5) goalLevel = gl;
    // the Filters switch "I hold an active security clearance" (no level given) meets any requirement
    if (prefs.clearance && clr < 4) { clr = 4; clrFrom = 'you said you hold an active clearance'; }
    return {
      skills: skills, customSkills: custom.slice(0, 20),
      years: years, yearsSource: yearsSource, relatedYears: relYears,
      level: level, levelSource: levelSource, levelLabel: levelLabel(level), goalLevel: goalLevel,
      education: edu,
      roles: roles, goalText: goalText.trim(), goalTokens: goalTokens,
      industries: indOrder.map(function (d) { return { id: d, name: I.ind[d].name, from: inds[d] }; }),
      location: loc,
      needsSponsorship: !!prefs.needsSponsorship,
      citizen: prefs.citizen === true ? true : (prefs.citizen === false || prefs.needsSponsorship ? false : (citizenTxt ? true : null)),
      permanentResident: !!prefs.permanentResident && !prefs.needsSponsorship,
      clearance: clr > 0, clearanceLevel: clr, clearanceFrom: clrFrom,
      mgmt: mgmt,
      licenseStates: licStates, licenseCompact: licCompact,
      permanentNow: permanentNow,
      orm: ormCandidate(ormUnits),
      stage: st,
      enrolled: st === 'student' ? true : ((edu && edu.inProgress != null) ? true : ((st === 'grad' || st === 'working' || st === 'switch' || (edu && edu.level != null)) ? false : null)),
      gradAt: gradAt,
      provenCount: Object.keys(skills).filter(function (k) { return skills[k].level === 'proven'; }).length,
      statedCount: Object.keys(skills).filter(function (k) { return skills[k].level === 'stated'; }).length,
    };
  }
  var ACTION_VERB = /(?<![a-z])(built|build|building|developed|develop|created|create|analy[sz]ed|analy[sz]ing|led|lead|managed|manage|designed|implemented|ran|run|used|using|wrote|write|automated|improved|delivered|launched|reduced|increased|migrated|maintained|deployed|trained|presented|conducted|owned|shipped|optimi[sz]ed|modeled|modelled|reported|tested|supported|coordinated|wrote|taught|cared|administered|prepared|reconciled|audited|negotiated|sold|closed|grew|drove|partnered|collaborated|mentored|supervised|handled|processed|tracked|monitored|researched|programmed|coded|configured|integrated|refactored|scaled|debugged|resolved|served|assisted|helped|organized|planned)(?![a-z])/;
  var PART_TIME = /(?<![a-z])(part[- ]time|teaching assistant|graduate assistant|student (worker|assistant|employee|ambassador)|work[- ]study|resident assistant|peer tutor|undergraduate (researcher|research assistant|assistant))(?![a-z])/;
  var MGMT_DONE = /(?<![a-z])((managed|led|supervised|oversaw|ran|built and led|hired and managed|hired and led) (a |an |the )?(team|staff|crew|group|squad|unit)( of)?|(managed|oversaw|ran|headed|supervised) (a |an |the )?([a-z&-]+ ){0,2}department|(manage|managed|managing|supervise|supervised|supervising|oversee|oversaw|overseeing|lead|led|leading) (a team of |teams of |a staff of )?\d+(\s*-\s*\d+)?\+? (people|engineers|employees|staff|reports|analysts|nurses|designers|associates|auditors|accountants|technicians|agents|representatives|reps|apprentices|electricians|developers|teachers|specialists|coordinators)|\d+ direct reports|direct reports|people manager|people management)(?![a-z])/;
  var PEOPLE_MGR_TITLE = /(?<![a-z])(manager|supervisor|director|head of|team lead|team leader|charge nurse|nurse manager|store manager|general manager|superintendent|foreman|vp|vice president|chief)(?![a-z])/;
  var NOT_PEOPLE_MGR = /(?<![a-z])(product|project|program|account|marketing|social media|content|community|office|case|property|portfolio|brand|campaign|category|relationship|customer success|success|partner|channel|release|delivery|data|database|configuration|change) manager(?![a-z])/;
  var LEADERSHIP_TITLE = /(?<![a-z])(manager|supervisor|director|head of|lead|leader|superintendent|foreman|owner|principal)(?![a-z])/;
  // words any title can carry - sharing one with your goal says nothing about the kind of job
  var TITLE_GENERIC = ['senior', 'junior', 'lead', 'principal', 'staff', 'associate', 'assistant', 'intern', 'internship', 'interns', 'trainee', 'apprentice', 'entry', 'corporate', 'global', 'regional', 'remote', 'hybrid', 'onsite', 'on-site', 'part-time', 'full-time', 'part', 'time', 'full', 'contract', 'temporary', 'seasonal', 'new', 'grad', 'graduate', 'engineering', 'engineer', 'specialist', 'coordinator', 'officer', 'representative', 'professional', 'team', 'member', 'program', 'services', 'service', 'day', 'night', 'shift', 'weekend'];
  var GOAL_STOP = ['the', 'and', 'for', 'with', 'into', 'from', 'that', 'this', 'want', 'break', 'become', 'get', 'job', 'role', 'work', 'working', 'company', 'companies', 'career', 'eventually', 'someday', 'like', 'some', 'kind', 'field', 'industry', 'position', 'something', 'where', 'can', 'about', 'their', 'them', 'more', 'less', 'really', 'very', 'good', 'great', 'top', 'best', 'my', 'our', 'your', 'who', 'what', 'which', 'also', 'focused', 'driven', 'based', 'level', 'entry', 'senior', 'junior', 'year', 'years', 'next'];

  function parseUserLocation(raw) {
    var I = idx();
    var s = lc(raw).trim();
    var res = { metros: [], states: [], remoteOk: false, remoteOnly: false, anywhere: false, raw: str(raw).trim() };
    if (!s) return res;
    if (/(?<![a-z])(remote|work from home|wfh)(?![a-z])/.test(s)) res.remoteOk = true;
    if (/(?<![a-z])(anywhere|any location|open to relocat|willing to relocate|flexible)(?![a-z])/.test(s)) res.anywhere = true;
    parsePlaces(s).forEach(function (p) {
      if (p.metro && res.metros.indexOf(p.metro) === -1) res.metros.push(p.metro);
      if (p.state && res.states.indexOf(p.state) === -1) res.states.push(p.state);
    });
    res.remoteOnly = res.remoteOk && !res.metros.length && !res.states.length && !res.anywhere;
    return res;
  }

  /* --------------------------------------------------------------- scoring */
  function interp(x, knots) {
    // knots: [[x0,y0],[x1,y1],...] ascending x; flat beyond ends
    if (x <= knots[0][0]) return knots[0][1];
    for (var i = 1; i < knots.length; i++) {
      if (x <= knots[i][0]) { var a = knots[i - 1], b = knots[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    }
    return knots[knots.length - 1][1];
  }
  var YEARS_KNOTS = [[0.5, 100], [1, 85], [2, 60], [3, 40], [5, 20]];
  // plain words for experience: internships count half, so a summer internship is "under a year", not "0.1"
  function yrsHave(y) { return y <= 0 ? 'none on record' : (y < 1 ? 'under a year' : 'about ' + y + (y === 1 ? ' year' : ' years')); }
  var LEVEL_KNOTS = [[-3, 45], [-2, 65], [-1, 85], [-0.5, 100], [0.5, 100], [1, 70], [2, 40], [3, 15]];

  function roleSim(a, b) {
    var I = idx();
    if (!I.role[a] || !I.role[b]) return 0;
    if (a === b) return 1;
    var pa = I.role[a].parent, pb = I.role[b].parent;
    if (pa === b || pb === a) return 0.95;
    if (pa && pa === pb) return 0.7;
    var w = I.adj[a + '|' + b];
    if (w != null) return w;
    var w2 = I.adj[(pa || a) + '|' + (pb || b)];
    if (w2 != null) return rhu(w2 * 90) / 100;
    if (I.role[a].group === I.role[b].group) return 0.5;
    return 0.15;
  }

  function skillCredit(js, cand) {
    var I = idx();
    var c = cand.skills[js.id];
    if (c) return { credit: c.level === 'proven' ? 1 : 0.85, how: c.level, evidence: c.evidence, source: c.source, via: c.via, match: js.id };
    if (js.family && I.family[js.family]) {
      var fam = I.family[js.family], pick = null;
      for (var pass = 0; pass < 2 && !pick; pass++) {
        for (var i = 0; i < fam.length; i++) {
          var k = fam[i]; if (k === js.id) continue;
          var ck = cand.skills[k];
          if (ck && (pass === 1 || ck.level === 'proven')) { pick = ck; break; }
        }
      }
      if (pick) return { credit: 0.45, how: 'adjacent', evidence: pick.evidence, source: pick.source, via: pick.name, match: pick.id };
    }
    var imp = I.skill[js.id].implies || [];
    for (var j = 0; j < imp.length; j++) {
      var ci = cand.skills[imp[j]];
      if (ci) return { credit: 0.3, how: 'related', evidence: ci.evidence, source: ci.source, via: ci.name, match: imp[j] };
    }
    return { credit: 0, how: 'missing', evidence: '', source: '', via: null, match: null };
  }

  function modeLocScore(job, cand, prefs) {
    var modes = Array.isArray(prefs.modes) ? prefs.modes : [];
    var P = cand.location;
    if (job.mode == null && !job.places.length) return null;
    var outside = false, modeMiss = false;
    if (job.mode === 'remote') {
      if (job.remoteRegion && cand.country && job.remoteRegion !== cand.country) return { v: 25, why: 'Remote, but only for candidates in ' + (REGION_NAMES[job.remoteRegion] || job.remoteRegion), outside: true, modeMiss: false };
      if (modes.length && modes.indexOf('remote') === -1) return { v: 60, why: 'Remote \u2014 you said you\u2019d rather work ' + modes.map(modeWord).join(' or '), outside: false, modeMiss: true };
      return { v: 100, why: 'Remote' + (job.remoteRegion ? ' (' + (REGION_NAMES[job.remoteRegion] || job.remoteRegion) + ')' : ''), outside: false, modeMiss: false };
    }
    var base, why, kind = job.mode === 'hybrid' ? 'Hybrid' : 'On-site';
    var placeTxt = cleanLoc(job.location) || job.places.map(function (p) { return p.label; }).join(' / ');
    if (!P.metros.length && !P.states.length) {
      if (P.remoteOnly) { base = prefs.relocate ? 70 : 20; why = kind + ' in ' + placeTxt + ' \u2014 you said remote'; outside = !prefs.relocate; }
      else { base = 85; why = kind + ' in ' + placeTxt + ' (add where you live to check the commute)'; }
    } else {
      var inMetro = job.places.some(function (p) { return p.metro && P.metros.indexOf(p.metro) !== -1; });
      var inState = !inMetro && job.places.some(function (p) { return p.state && P.states.indexOf(p.state) !== -1 && !(p.metro && P.metros.length); });
      if (inMetro) { base = 100; why = kind + ' in your area (' + placeTxt + ')'; }
      else if (inState) { base = 80; why = kind + ' in your state (' + placeTxt + ')'; }
      else if (prefs.relocate || P.anywhere) { base = 70; why = kind + ' in ' + placeTxt + ' \u2014 you\u2019re open to relocating'; }
      else { base = 20; why = kind + ' in ' + placeTxt + ' \u2014 outside your area'; outside = true; }
    }
    var wantModes = modes.length ? modes : (P.remoteOnly ? ['remote'] : []);
    if (wantModes.length && job.mode && wantModes.indexOf(job.mode) === -1) {
      modeMiss = true;
      var cap = job.mode === 'hybrid' ? 55 : 45;
      if (base > cap) { base = cap; why += ' \u2014 you prefer ' + wantModes.map(modeWord).join(' or '); }
    }
    return { v: base, why: why, outside: outside, modeMiss: modeMiss };
  }
  function cleanLoc(loc) {
    return str(loc).replace(/[(\[]\s*(hybrid|remote|on-?site|in-office|in office)[^)\]]*[)\]]/ig, ' ').replace(/(?<![A-Za-z])(hybrid|on-?site)(?![A-Za-z])/ig, ' ').replace(/\s+/g, ' ').replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  }
  function modeWord(m) { return m === 'onsite' ? 'on-site' : m; }

  // open-vocabulary weights: a posting term counts ORM_TERM_W of a taxonomy skill; its specific words together count
  // up to ORM_BETA_MAX skills (one per ORM_BETA_DIV of word weight) once there are at least ORM_VMIN of them
  var ORM_TERM_W = 0.4, ORM_BETA_MAX = 2, ORM_BETA_DIV = 6, ORM_VMIN = 3, ORM_THIN = 3, ORM_VREF = 0.55;
  var DEFAULT_WEIGHTS = { skills: 45, level: 20, role: 30, industry: 5 };
  var REGION_NAMES = { US: 'the US', CA: 'Canada', UK: 'the UK', EU: 'Europe / EMEA', LATAM: 'Latin America', APAC: 'Asia-Pacific', IN: 'India' };
  function bandOf(score) {
    if (score == null) return { key: 'unknown', label: 'Not enough info' };
    if (score >= 85) return { key: 'excellent', label: 'Excellent match' };
    if (score >= 70) return { key: 'strong', label: 'Strong match' };
    if (score >= 55) return { key: 'partial', label: 'Partial match' };
    if (score >= 40) return { key: 'weak', label: 'Weak match' };
    return { key: 'poor', label: 'Poor match' };
  }

  function scoreJob(job, cand, prefs, opts) {
    var I = idx();
    prefs = prefs || {}; opts = opts || {};
    var qr = (opts.queryRoles || []).filter(function (r) { return !!I.role[r]; });
    var targets = qr.length ? qr : cand.roles.map(function (r) { return r.id; });
    var W = {}; Object.keys(DEFAULT_WEIGHTS).forEach(function (k) { var v = prefs.weights && isNum(prefs.weights[k]) ? prefs.weights[k] : DEFAULT_WEIGHTS[k]; W[k] = clamp(v, 0, 100); });
    var caps = [], positives = [], gaps = [];
    // ---- skills: each "A or B" choice is one requirement, credited by your best option
    var units = [], unitByGroup = {}, detail = [];
    job.skills.forEach(function (s) {
      var c = skillCredit(s, cand);
      var d = { id: s.id, name: s.name, kind: s.kind, required: s.required, implied: !!s.implied, group: s.group || null, credit: c.credit, how: c.how, evidence: c.evidence, source: c.source, via: c.via, jobEvidence: s.evidence };
      detail.push(d);
      if (s.group) {
        var u = unitByGroup[s.group];
        if (!u) { u = unitByGroup[s.group] = { members: [], required: false, credit: 0 }; units.push(u); }
        u.members.push(d); if (s.required) u.required = true; if (c.credit > u.credit) u.credit = c.credit;
      } else units.push({ members: [d], required: s.required, credit: c.credit });
    });
    units.forEach(function (u) { u.members.forEach(function (d) { d.unitCredit = u.credit; d.alternatives = u.members.length > 1 ? u.members.map(function (x) { return x.name; }) : null; }); });
    var reqU = units.filter(function (u) { return u.required; }), prfU = units.filter(function (u) { return !u.required; });
    var reqSum = 0, prfSum = 0;
    reqU.forEach(function (u) { reqSum += u.credit; }); prfU.forEach(function (u) { prfSum += u.credit; });
    var covReq = reqU.length ? reqSum / reqU.length : null, covPref = prfU.length ? prfSum / prfU.length : null;
    var x = covReq == null ? covPref : (covPref == null ? covReq : 0.75 * covReq + 0.25 * covPref);
    // the posting's own terms (open vocabulary): its codes and product names, and its specific words
    var om = job.orm || { terms: [], vocab: [] }, co = cand.orm || { keys: {}, stems: {} };
    var tReq = 0, tReqN = 0, tPrf = 0, tPrfN = 0, tHit = [], tMiss = [];
    om.terms.forEach(function (t) {
      var lv = own(co.keys, t.key) || 0, cr = lv === 2 ? 1 : (lv === 1 ? 0.85 : 0);
      if (t.required) { tReq += cr; tReqN++; } else { tPrf += cr; tPrfN++; }
      (cr ? tHit : tMiss).push(t);
    });
    var vW = 0, vGot = 0, vHit = [], vMiss = [];
    om.vocab.forEach(function (v) { var lv = own(co.stems, v.stem) || 0, cr = lv === 2 ? 1 : (lv === 1 ? 0.85 : 0); vW += v.w; vGot += v.w * cr; (cr ? vHit : vMiss).push(v); });
    // a strong match shares about ORM_VREF of a posting's weighted words (postings say far more than any resume does)
    var V = vW >= ORM_VMIN ? Math.min(1, vGot / vW / ORM_VREF) : null;
    var tCovReq = tReqN ? tReq / tReqN : null, tCovPrf = tPrfN ? tPrf / tPrfN : null;
    var xT = tCovReq == null ? tCovPrf : (tCovPrf == null ? tCovReq : 0.75 * tCovReq + 0.25 * tCovPrf);
    var nT = xT == null ? 0 : ORM_TERM_W * (tReqN + tPrfN), nV = V == null ? 0 : Math.min(ORM_BETA_MAX, vW / ORM_BETA_DIV);
    var nO = nT + nV, xO = nO > 0 ? ((xT == null ? 0 : nT * xT) + (V == null ? 0 : nV * V)) / nO : null;
    var nX = reqU.length + prfU.length;
    if (xO != null) { x = x == null ? xO : (nX * x + nO * xO) / (nX + nO); }
    var S = null, nS = nX + nO;
    if (x != null) {
      var raw = 100 * (1 - Math.pow(1 - x, 1.4));
      S = rhu((nS * raw + 1.5 * 55) / (nS + 1.5));
    }
    var nNamed = nX + tReqN + tPrfN;
    // few named skills = less evidence, so the score is pulled toward the middle; say so
    var skCaution = (S != null && Math.abs(S - rhu(raw)) >= 3) ? ' · scored cautiously: only ' + nNamed + (nNamed === 1 ? ' requirement is' : ' requirements are') + ' named' : '';
    if (reqU.length >= 2 && covReq < 0.5) caps.push({ cap: 59, key: 'skills', why: 'Covers under half of the required skills' });
    else if (reqU.length === 1 && covReq === 0) caps.push({ cap: 59, key: 'skills', why: 'Missing its one required skill: ' + reqU[0].members.map(function (d) { return d.name; }).join(' or ') });
    // "Excellent" means every required skill is covered (proven or listed), not just most of them
    var weakReq = reqU.filter(function (u) { return u.credit < 0.85; });
    if (weakReq.length) caps.push({ cap: 84, key: 'skills_gap', why: 'Not every required skill is covered (' + weakReq.slice(0, 2).map(function (u) { return u.members.map(function (d) { return d.name; }).join(' or '); }).join(', ') + (weakReq.length > 2 ? ', …' : '') + ') - so not Excellent' });
    // nothing the posting asks for could be read: a title match can't be "Excellent"
    if (S == null) caps.push({ cap: 69, key: 'title_only', why: 'The posting names no skills Kaidostar can check - this is a title match only' });
    else if (nS <= ORM_THIN) caps.push({ cap: 84, key: 'thin_reqs', why: 'Only ' + nNamed + ' of the posting’s requirements could be checked - so it can’t count as Excellent' });
    else if (cand.provenCount === 0 && reqU.length) caps.push({ cap: 84, key: 'evidence', why: 'None of your skills are backed by a resume line yet - add one to be rated above Strong' });
    reqU.forEach(function (u) {
      // a required certification or license is held or it isn't: a related one (Security+ for OSCP,
      // a journeyman license for a master's) never stands in for it
      if ((u.credit < 0.4 && u.members.some(function (d) { return d.kind === 'cert'; })) || (u.credit === 0 && u.members.some(function (d) { return d.kind === 'lang'; }))) {
        var lic = u.members.some(function (d) { return !!(I.skill[d.id] && I.skill[d.id].license); });
        caps.push(lic ? { cap: 49, key: 'license', why: 'Requires ' + u.members.map(function (d) { return d.name; }).join(' or ') + ' — a license or credential you don’t list' }
                      : { cap: 60, key: 'cert', why: 'Requires ' + u.members.map(function (d) { return d.name; }).join(' or ') + ' — not found in your profile' });
      }
    });
    // the skill a job is named for ("Backend Engineer (Rust)", "Salesforce Administrator") is its core:
    // without it - or at least a close relative of it - it can't be more than a partial match
    var titleIds = findSkills(job.title).map(function (h) { return h.id; }).filter(function (id) { return I.skill[id] && I.skill[id].kind !== 'soft'; });
    if (titleIds.length) {
      var coreU = reqU.filter(function (u) { return u.members.some(function (d) { return titleIds.indexOf(d.id) !== -1; }); });
      if (coreU.length && coreU.every(function (u) { return u.credit < 0.4; })) caps.push({ cap: 59, key: 'title_skill', why: 'Missing the skill this job is named for: ' + coreU[0].members.map(function (d) { return d.name; }).join(' or ') });
    }
    // ---- level (years, title level, education)
    var ys = null, ls = null, es = null, gap = null, dlev = null;
    if (job.yearsMin != null && cand.years != null && !job.yearsPreferred) {
      // with the degree it names, the posting's shorter bar is the one you're held to
      var yMin = job.yearsMin, ya = job.yearsAlt, yAltTxt = '';
      if (ya && ya.min < yMin && cand.education && cand.education.level != null && cand.education.level >= ya.edu) { yMin = ya.min; yAltTxt = ' with a ' + EDU_NAMES[ya.edu]; }
      gap = round1(yMin - cand.years);
      ys = interp(gap, YEARS_KNOTS);
      if (job.level != null && job.level <= 1.5 && cand.years >= yMin + 5) ys = Math.min(ys, 75);
      // "Excellent" means you clear the posting's own bar: a year or more short of it can't
      // be, two short is a stretch, three short is a long shot
      var yWhy = 'Asks for ' + yMin + '+ years' + yAltTxt + '; you have ' + yrsHave(cand.years);
      if (gap >= 3) caps.push({ cap: 50, key: 'years', why: yWhy });
      else if (gap >= 2) caps.push({ cap: 64, key: 'years', why: yWhy });
      else if (gap >= 1) caps.push({ cap: 79, key: 'years', why: yWhy });
      if (yMin >= 2 && cand.years < yMin / 2 && gap < 2) caps.push({ cap: 69, key: 'years', why: yWhy + ' - under half of what it asks' });
    } else if (job.yearsMin != null && !job.yearsPreferred && cand.years == null) {
      caps.push({ cap: 84, key: 'unverified', why: 'Asks for ' + job.yearsMin + '+ years - add dated work history so Kaidostar can check' });
    }
    if (job.level != null && cand.level != null) {
      dlev = job.level - cand.level;
      ls = interp(dlev, LEVEL_KNOTS);
      // over-qualification needs proof the posting is junior - its title, its pay or a years RANGE
      // (a minimum is a floor, not a ceiling) - and a count of years alone never makes you more than senior
      // (a level read from the posting's years is judged by the years-range rule below, on your related years)
      var juniorProof = job.levelSource !== 'years';
      var dOver = job.level - ((cand.levelSource === 'years of experience' && cand.level > 3) ? 3 : cand.level);
      if (dlev >= 2) caps.push({ cap: 60, key: 'level', why: job.levelLabel + ' role; you read as ' + cand.levelLabel.toLowerCase() });
      else if (dlev >= 1.5) caps.push({ cap: 69, key: 'level', why: job.levelLabel + ' role; you read as ' + cand.levelLabel.toLowerCase() + ' - a stretch' });
      else if (juniorProof && dOver <= -2) caps.push({ cap: 69, key: 'overqualified', why: job.levelLabel + ' role - well below your experience (' + cand.levelLabel.toLowerCase() + ')' });
      else if (juniorProof && dOver <= -1.5) caps.push({ cap: 69, key: 'overqualified', why: job.levelLabel + ' role - below your experience (' + cand.levelLabel.toLowerCase() + ')' });
    }
    // a years RANGE you're far past ("2-5 years" with 13, "0-2 years" with 6) is a step down, whatever the title says
    // counted on the years in your field (a career switcher starts fresh in the new one)
    var ry = cand.stage === 'switch' ? null : (cand.relatedYears != null ? cand.relatedYears : cand.years);
    if (job.yearsMax != null && ry != null && !job.yearsPreferred && ry >= job.yearsMax + (job.yearsMax <= 3 ? 4 : 5) && !caps.some(function (c) { return c.key === 'overqualified'; })) {
      caps.push({ cap: 69, key: 'overqualified', why: 'Asks for ' + (job.yearsMin != null ? job.yearsMin + '–' : 'up to ') + job.yearsMax + ' years; you have ' + yrsHave(ry) + (ry !== cand.years ? ' in this line of work' : '') });
    }
    if (job.mgmt && job.mgmt.asks && !cand.mgmt) caps.push({ cap: 64, key: 'management', why: 'Asks for people-management experience; none shows in your resume' });
    var en = job.enroll;
    if (en && en.required && cand.enrolled === false) caps.push({ cap: 40, key: 'eligibility', why: 'For current students - you’ve finished your degree' });
    if (en && en.returning && en.termEnd != null && cand.gradAt != null && cand.gradAt <= en.termEnd && cand.enrolled !== false) caps.push({ cap: 40, key: 'eligibility', why: 'For students returning to school after it; you graduate ' + ymLabel(cand.gradAt) });
    if (en && en.gradFrom != null && cand.gradAt != null && (cand.gradAt < en.gradFrom || cand.gradAt > en.gradTo)) caps.push({ cap: 40, key: 'eligibility', why: 'For people graduating ' + ymLabel(en.gradFrom) + '–' + ymLabel(en.gradTo) + '; your graduation date is ' + ymLabel(cand.gradAt) });
    var er = job.education.level;
    if (er != null && cand.education) {
      var have = cand.education.level, prog = cand.education.inProgress;
      if (have != null && have >= er) es = 100;
      else if (prog != null && prog >= er) es = (job.type === 'internship' || (job.level != null && job.level <= 1)) ? 95 : 75;
      else if (job.education.equivalentOk) es = 70;
      else es = 35;
      if (es === 35) caps.push({ cap: er >= 3 ? 60 : 68, key: 'education', why: 'Requires a ' + EDU_NAMES[er] + ' you don’t list' });
    } else if (er != null && !cand.education && !job.education.equivalentOk) {
      caps.push({ cap: 84, key: 'unverified', why: 'Asks for a ' + EDU_NAMES[er] + ' - add your education so Kaidostar can check' });
    }
    var parts = [ys, ls, es].filter(function (v) { return v != null; });
    var L = null;
    if (parts.length) {
      var mn = Math.min.apply(null, parts), mean = parts.reduce(function (a, b) { return a + b; }, 0) / parts.length;
      L = rhu(0.6 * mn + 0.4 * mean);
    }
    // ---- role
    var R = null, roleWhy = '', bestPair = null;
    if (targets.length && job.roles.length) {
      var best = -1;
      targets.forEach(function (t) { job.roles.forEach(function (jr) { var sm = roleSim(t, jr.id); if (sm > best) { best = sm; bestPair = [t, jr.id]; } }); });
      R = rhu(best * 100);
      roleWhy = I.role[bestPair[1]].name + (bestPair[0] === bestPair[1] ? ' — your target role' : ' vs your target ' + I.role[bestPair[0]].name);
    } else if (cand.goalTokens.length && !targets.length) {
      var tt = (lc(job.title).match(/[a-z][a-z+#.-]{2,}/g) || []).filter(function (w) { return GOAL_STOP.indexOf(w) === -1 && TITLE_GENERIC.indexOf(w) === -1; });
      var ov = uniq(tt.filter(function (w) { return cand.goalTokens.indexOf(w) !== -1; }));
      R = ov.length >= 2 ? 75 : (ov.length === 1 ? 55 : 25);
      roleWhy = ov.length ? 'Title shares "' + ov.slice(0, 2).join('", "') + '" with your goal' : 'Title doesn’t echo your goal';
    } else if (targets.length && !job.roles.length) {
      // the title names no role family we know: judge it by the words it shares with your goal and targets
      var tw = uniq((lc(job.title).match(/[a-z][a-z+#.-]{2,}/g) || []).filter(function (w) { return GOAL_STOP.indexOf(w) === -1 && TITLE_GENERIC.indexOf(w) === -1; }));
      var mine = uniq(cand.goalTokens.concat([].concat.apply([], targets.map(function (t) { return (lc(I.role[t].name).match(/[a-z][a-z+#.-]{2,}/g) || []); }))));
      var shared = tw.filter(function (w) { return mine.indexOf(w) !== -1; });
      R = shared.length >= 2 ? 70 : (shared.length === 1 ? 50 : 25);
      roleWhy = shared.length ? 'Role family unclear; the title shares "' + shared.slice(0, 2).join('", "') + '" with your goal' : 'Role family unclear, and the title doesn’t echo your goal';
      caps.push({ cap: 79, key: 'role_unknown', why: 'Couldn’t tell what kind of role this is from its title - so it can’t count as Excellent' });
    }
    // a title we can't place and no skills to check: there's nothing to rate it on beyond your level
    if (!job.roles.length && nX === 0 && !tHit.length) caps.push({ cap: 54, key: 'unplaced', why: 'Kaidostar couldn’t place this title or find any skills to check in the posting - too little to rate it higher' });
    if (R != null && R <= 20) caps.push({ cap: 39, key: 'role', why: 'Different field from your target roles' });
    // ---- industry experience (part of fit): have you worked in this industry?
    var Dx = null, indWhy = '';
    if (job.industries.length) {
      var haveInd = null;
      for (var ii = 0; ii < job.industries.length && !haveInd; ii++) { for (var ci = 0; ci < cand.industries.length; ci++) { if (cand.industries[ci].id === job.industries[ii].id) { haveInd = cand.industries[ci]; break; } } }
      if (haveInd) { Dx = 100; indWhy = 'You\u2019ve worked in ' + haveInd.name.toLowerCase() + ' (' + haveInd.from + ')'; }
      else { Dx = 60; indWhy = job.industries[0].name + ' \u2014 a new industry for you'; }
    }
    // ---- eligibility (can you legally take this job?)
    if (cand.needsSponsorship && job.auth.noSponsorship) caps.push({ cap: 25, key: 'auth', why: 'States it won\u2019t sponsor visas; you said you need sponsorship' });
    if (job.auth.citizenship && cand.citizen === false) caps.push({ cap: 25, key: 'auth', why: 'Requires U.S. citizenship' });
    if (job.auth.citizenOrPR && cand.citizen === false && !cand.permanentResident) caps.push({ cap: 25, key: 'auth', why: 'Open only to U.S. citizens and permanent residents' });
    if (job.auth.clearance && (cand.clearanceLevel || 0) < (job.auth.clearanceLevel || 2)) {
      // you hold one, but a lower level than the posting asks for: say both
      var cl0 = cand.clearanceLevel || 0, need = CLR_NAMES[job.auth.clearanceLevel || 2];
      var clWhy = cl0 ? 'Requires a ' + need + ' clearance; you list ' + CLR_NAMES[cl0] : 'Requires a security clearance you don\u2019t list';
      if (!cl0 && (cand.citizen === false || cand.needsSponsorship)) caps.push({ cap: 25, key: 'auth', why: 'Requires a security clearance (generally U.S. citizens only)' });
      else if (job.auth.clearanceActive) caps.push({ cap: 35, key: 'clearance', why: cl0 ? 'Requires an active ' + need + ' clearance; you list ' + CLR_NAMES[cl0] : 'Requires an active security clearance you don\u2019t list' });
      else if (job.auth.clearanceObtainable) caps.push({ cap: (cl0 || cand.citizen === true) ? 79 : 65, key: 'clearance', why: clWhy + (cl0 ? ' (they may sponsor the upgrade)' : (cand.citizen === true ? ' (they may sponsor one, and as a U.S. citizen you can be cleared)' : ' (they may sponsor one)')) });
      else caps.push({ cap: 50, key: 'clearance', why: clWhy });
    }
    if (job.mode === 'remote' && job.remoteRegion && cand.country && job.remoteRegion !== cand.country) caps.push({ cap: 30, key: 'region', why: 'Remote, but only for candidates in ' + REGION_NAMES[job.remoteRegion] });
    var rl = job.remoteLimit, cst = candStates(cand);
    if (job.mode === 'remote' && rl && cst.length) {
      var czones = cst.map(function (c) { return ST_ZONE[c]; });
      var inState = rl.states.length && cst.some(function (c) { return rl.states.indexOf(c) !== -1; });
      var inZone = rl.zones.length && czones.some(function (z) { return rl.zones.indexOf(z) !== -1; });
      if ((rl.states.length || rl.zones.length) && !inState && !inZone) caps.push({ cap: 30, key: 'region', why: 'Remote, but only for people in ' + rl.states.concat(rl.zones.map(function (z) { return ZONE_NAMES[z] + ' time'; })).join(', ') });
      else if (rl.excluded.length && cst.every(function (c) { return rl.excluded.indexOf(c) !== -1; })) caps.push({ cap: 30, key: 'region', why: 'Remote, but not open to people in ' + cst.join(', ') });
    }
    var lic = job.license;
    var licMove = false;
    if (lic && cand.licenseStates && cand.licenseStates.length && !cand.licenseStates.some(function (c) { return lic.states.indexOf(c) !== -1; }) && !(lic.compactOk && cand.licenseCompact)) {
      // the posting itself lets you transfer yours (reciprocity, endorsement, "within 90 days of hire"): a step, not a bar
      if (lic.transferOk) licMove = true;
      else caps.push({ cap: 60, key: 'license_state', why: 'Requires a license in ' + lic.states.join(' or ') + '; your resume shows ' + cand.licenseStates.join(', ') });
    }
    // ---- combine (qualification fit only - your preferences rank, they don't relabel your qualifications)
    var dims = { skills: S, level: L, role: R, industry: Dx };
    var wsum = 0, acc = 0;
    Object.keys(DEFAULT_WEIGHTS).forEach(function (k) { if (dims[k] != null && W[k] > 0) { wsum += W[k]; acc += W[k] * dims[k]; } });
    var fitRaw = wsum > 0 ? acc / wsum : null;
    var fit = fitRaw == null ? null : rhu(fitRaw);
    var capApplied = null;
    if (fit != null) caps.forEach(function (c) { if (c.cap < fit) { if (!capApplied || c.cap < capApplied.cap) capApplied = c; } });
    var finalFit = fit == null ? null : (capApplied ? capApplied.cap : fit);
    // ---- your preferences (separate from fit): where, how, how much, what kind
    var pitems = [], flags = { outsideArea: false, modeMismatch: false, belowFloor: false, typeMismatch: false, avoidIndustry: false };
    var ml = modeLocScore(job, cand, prefs);
    if (ml) { pitems.push({ key: 'location', score: ml.v, ok: ml.v >= 80, text: ml.why }); flags.outsideArea = ml.outside; flags.modeMismatch = ml.modeMiss; }
    var types = Array.isArray(prefs.types) ? prefs.types : [];
    if (types.length && job.employmentType) {
      var tok = types.indexOf(job.employmentType) !== -1;
      pitems.push({ key: 'type', score: tok ? 100 : 30, ok: tok, text: TYPE_NAMES[job.employmentType] + (tok ? '' : ' \u2014 not a type you picked') });
      flags.typeMismatch = !tok;
    } else if (!types.length && cand.permanentNow && (job.employmentType === 'contract' || job.employmentType === 'temporary')) {
      // you haven't said which job types you'd take, and the job you have now is permanent: a contract ranks a little lower
      pitems.push({ key: 'type', score: 60, ok: false, text: TYPE_NAMES[job.employmentType] + ' \u2014 you\u2019re in a permanent job now; add Contract to your job types if you\u2019d take one' });
    }
    var top = job.salary.annualMax != null ? job.salary.annualMax : job.salary.annualMin;
    var F = isNum(prefs.salaryFloor) ? prefs.salaryFloor : null, T = isNum(prefs.salaryTarget) ? prefs.salaryTarget : null;
    if (top != null && (F != null || T != null)) {
      var sv;
      if (F != null && T != null && T > F) sv = top >= T ? 100 : (top >= F ? 60 + 40 * (top - F) / (T - F) : 25);
      else if (F != null) sv = top >= F ? 100 : 25;
      else sv = top >= T ? 100 : (top >= 0.85 * T ? 75 : 45);
      sv = rhu(sv);
      pitems.push({ key: 'salary', score: sv, ok: sv >= 60, text: payUpTo(job) + fmtK(top) + (sv === 25 ? ' \u2014 below your $' + fmtK(F) + ' floor' : (sv === 100 ? ' \u2014 meets your ' + (T != null ? 'target' : 'floor') : ' \u2014 under your $' + fmtK(T) + ' target')) });
      flags.belowFloor = sv === 25;
    }
    var want = Array.isArray(prefs.industries) ? prefs.industries : [], avoid = Array.isArray(prefs.avoidIndustries) ? prefs.avoidIndustries : [];
    if ((want.length || avoid.length) && job.industries.length) {
      var ji = job.industries.map(function (d) { return d.id; });
      var av = ji.filter(function (d) { return avoid.indexOf(d) !== -1; }), wa = ji.filter(function (d) { return want.indexOf(d) !== -1; });
      if (av.length) { pitems.push({ key: 'industry', score: 10, ok: false, text: I.ind[av[0]].name + ' \u2014 an industry you want to avoid' }); flags.avoidIndustry = true; }
      else if (wa.length) pitems.push({ key: 'industry', score: 100, ok: true, text: I.ind[wa[0]].name + ' \u2014 an industry you picked' });
      else if (want.length) pitems.push({ key: 'industry', score: 45, ok: false, text: I.ind[ji[0]].name + ' \u2014 not one of your picked industries' });
    }
    // the level your goal names ("Senior Accountant"): a job at or below where you are now is a sideways step
    if (cand.goalLevel != null && job.level != null && cand.level != null) {
      if (job.level >= cand.goalLevel - 0.5) pitems.push({ key: 'level', score: 100, ok: true, text: job.levelLabel + ' \u2014 the level you\u2019re aiming for' });
      else if (job.level <= cand.level - 0.75) pitems.push({ key: 'level', score: 15, ok: false, text: job.levelLabel + ' \u2014 below where you are now' });
      else pitems.push({ key: 'level', score: 40, ok: false, text: job.levelLabel + ' \u2014 below the level you\u2019re aiming for (' + lc(levelLabel(cand.goalLevel)) + ')' });
    }
    var prefScore = pitems.length ? rhu(pitems.reduce(function (a, b) { return a + b.score; }, 0) / pitems.length) : null;
    // ---- confidence
    var pts = 0, creasons = [];
    var dc = job.richness.descChars;
    if (dc >= 1500) pts += 2; else if (dc >= 500) pts += 1; else creasons.push(dc ? 'the posting is short (' + dc + ' characters)' : 'the posting has no description');
    var nSk = units.length;
    if (nSk >= 5) pts += 2; else if (nSk >= 2) pts += 1; else creasons.push('few concrete requirements could be read from it');
    if (job.richness.sectioned) pts += 1;
    if (cand.provenCount >= 3) pts += 2; else if (cand.statedCount + cand.provenCount >= 3) { pts += 1; if (cand.provenCount === 0) creasons.push('your skills are listed but not yet backed by resume lines'); } else creasons.push('we know little about your experience yet');
    if (job.level != null && cand.level != null) pts += 1;
    if (R != null) pts += 1;
    var conf = pts >= 7 ? 'high' : (pts >= 4 ? 'medium' : 'low');
    // ---- explanation
    var sortedDet = detail.slice().sort(function (a, b) { return (b.required - a.required) || (b.credit - a.credit); });
    sortedDet.forEach(function (d) {
      if (d.credit >= 0.85 && positives.length < 4) positives.push({ kind: 'skill', text: (d.required ? 'Requires ' : 'Prefers ') + d.name + ' — ' + (d.how === 'proven' ? 'you’ve used it' : 'in your skills list'), evidence: d.evidence, source: d.source });
    });
    units.forEach(function (u) {
      if (!u.required) return;
      var names = u.members.map(function (d) { return d.name; }).join(' or ');
      if (u.credit === 0) gaps.push({ kind: 'missing', text: 'Missing: ' + names, evidence: u.members[0].jobEvidence });
      else if (u.credit < 0.85) {
        var best = u.members.slice().sort(function (a, b) { return b.credit - a.credit; })[0];
        gaps.push({ kind: 'partial', text: best.name + ' — ' + (best.how === 'adjacent' ? 'you have ' + best.via + ' (similar)' : 'you know ' + best.via + ', ' + best.name + ' builds on it'), evidence: best.jobEvidence });
      }
    });
    var tReqMiss = tMiss.filter(function (t) { return t.required; });
    if (tReqMiss.length) gaps.push({ kind: 'terms', text: 'Also asks for ' + tReqMiss.slice(0, 4).map(function (t) { return t.name; }).join(', ') + (tReqMiss.length > 4 ? ', …' : '') + ' - not in your resume' });
    if (gap != null && gap > 0.5) gaps.push({ kind: 'years', text: 'Asks for ' + yMin + '+ years' + yAltTxt + '; you have ' + yrsHave(cand.years), evidence: job.yearsText });
    if (licMove) gaps.push({ kind: 'license', text: 'Needs a license in ' + job.license.states.join(' or ') + ' - the posting lets you transfer yours (' + cand.licenseStates.join(', ') + ') after you’re hired', evidence: job.license.text });
    var shared = tHit.map(function (t) { return t.name; }).concat(vHit.slice().sort(function (a, b) { return b.w - a.w; }).filter(function (v) { return v.w >= 0.6; }).map(function (v) { return v.word; }));
    if (shared.length >= 2 && positives.length < 5) positives.push({ kind: 'terms', text: 'Your resume uses the posting’s own terms: ' + shared.slice(0, 5).join(', ') });
    if (R != null && R >= 70) positives.push({ kind: 'role', text: roleWhy });
    if (L != null && L >= 85) positives.push({ kind: 'level', text: job.levelLabel + ' — right for where you are' });
    if (Dx === 100) positives.push({ kind: 'industry', text: indWhy });
    var band = bandOf(finalFit);
    return {
      fit: finalFit, fitUncapped: fit, band: band.key, bandLabel: band.label,
      dims: dims, weights: W,
      dimNotes: { skills: S == null ? 'No concrete skills could be read from this posting' : (reqU.length ? rhu(covReq * 100) + '% of required skills covered' + (prfU.length ? ', ' + rhu(covPref * 100) + '% of nice-to-haves' : '') : rhu((covPref || 0) * 100) + '% of listed skills covered') + skCaution,
        level: L == null ? 'Level not stated or unknown for you' : [gap != null ? (gap > 0.5 ? 'Asks for ' + yMin + '+ yrs' + yAltTxt + '; you have ' + yrsHave(cand.years) : 'Years requirement met') : null, dlev != null ? job.levelLabel + ' vs you: ' + cand.levelLabel : null, es != null ? (es >= 95 ? 'Degree requirement met' : (es >= 70 ? 'Degree in progress / equivalent ok' : 'Degree requirement not met')) : null].filter(Boolean).join(' · '),
        role: R == null ? (roleWhy || 'Tell us your target roles to score this') : roleWhy,
        industry: Dx == null ? 'Industry not clear from the posting' : indWhy },
      caps: caps, capApplied: capApplied,
      pref: { score: prefScore, items: pitems, flags: flags },
      skillDetail: detail, coverage: { required: covReq, preferred: covPref, reqCount: reqU.length, prefCount: prfU.length },
      terms: { matched: tHit.map(function (t) { return t.name; }), missing: tMiss.map(function (t) { return t.name; }), missingRequired: tMiss.filter(function (t) { return t.required; }).map(function (t) { return t.name; }),
        vocab: V == null ? null : rhu(V * 100), vocabShared: vHit.slice().sort(function (a, b) { return b.w - a.w; }).slice(0, 8).map(function (v) { return v.word; }),
        vocabMissing: vMiss.slice().sort(function (a, b) { return b.w - a.w; }).slice(0, 8).map(function (v) { return v.word; }) },
      yearsGap: gap, levelGap: dlev, educationScore: es,
      roleMatch: bestPair ? { target: bestPair[0], job: bestPair[1] } : null,
      confidence: conf, confidenceReasons: creasons, confidencePoints: pts,
      positives: positives, gaps: gaps,
    };
  }
  function candStates(cand) {
    var L = cand.location, out = [];
    if (!L) return out;
    (L.states || []).forEach(function (c) { if (out.indexOf(c) === -1) out.push(c); });
    (L.metros || []).forEach(function (m) { var me = idx().metro[m]; if (me) me.states.forEach(function (c) { if (out.indexOf(c) === -1) out.push(c); }); });
    return out;
  }
  var MON_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function ymLabel(ym) { return MON_NAMES[(ym - 1) % 12] + ' ' + Math.floor((ym - 1) / 12); }
  var EDU_NAMES = ['high school diploma', 'associate degree', 'bachelor’s degree', 'master’s degree', 'PhD'];
  var TYPE_NAMES = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship', temporary: 'Temporary' };
  function fmtK(v) { if (v == null) return '?'; return v >= 1000 ? (rhu(v / 100) / 10).toString().replace(/\.0$/, '') + 'k' : String(v); }
  // a job board's own estimate is never stated as what the employer pays
  function payUpTo(job) { return job.salary.source === 'estimated' ? 'Estimated to pay up to $' : 'Pays up to $'; }

  /* -------------------------------------------------- opportunity quality */
  var Y2000 = 946684800000;
  var SAMPLED_SOURCES = ['adzuna', 'web_search_scholarship'];   // search APIs: each pull is a sample, not the whole feed
  function plausible(t, nowMs) { return t != null && t >= Y2000 && !(nowMs > 0 && t > nowMs + 2 * DAY); }   // a date in the future or before 2000 is a data error, not an age
  function assessOpportunity(job, nowMs) {
    var pa = plausible(job.postedAt, nowMs) ? job.postedAt : null, fs = plausible(job.firstSeenAt, nowMs) ? job.firstSeenAt : null;
    var base = pa != null ? pa : fs;
    var ageSource = pa != null ? 'posted' : (fs != null ? 'first_seen' : null);
    var ageDays = base != null ? Math.max(0, Math.floor((nowMs - base) / DAY)) : null;
    var fresh = ageDays == null ? 'unknown' : (ageDays <= 1 ? 'new' : (ageDays <= 3 ? 'fresh' : (ageDays <= 10 ? 'recent' : (ageDays <= 30 ? 'aging' : 'old'))));
    var pts = 0, reasons = [];
    var ageWord = ageSource === 'first_seen' ? 'first seen ' : 'posted ';
    if (ageDays != null && ageDays > 60) { pts += 4; reasons.push(ageWord + ageDays + ' days ago'); }
    else if (ageDays != null && ageDays > 30) { pts += 2; reasons.push(ageWord + ageDays + ' days ago'); }
    if (job.evergreen.is) { pts += 3; reasons.push('reads like a standing "talent pool" post ("' + job.evergreen.phrase + '")'); }
    var rc = job.repostCount || 0;
    if (rc >= 2) { pts += 2; reasons.push('reposted ' + rc + ' times'); } else if (rc === 1) { pts += 1; reasons.push('reposted once'); }
    var orig = plausible(job.originalPostedAt, nowMs) ? job.originalPostedAt : null;
    if (rc >= 1 && orig != null && Math.floor((nowMs - orig) / DAY) > 30) { pts += 1; reasons.push('first posted ' + Math.floor((nowMs - orig) / DAY) + ' days ago'); }
    if (job.agency.is) { pts += 1; reasons.push('posted by a staffing agency'); }
    if (job.richness.descChars < 200 && job.salary.source == null) { pts += 1; reasons.push('very little detail and no pay listed'); }
    var lastSeenDays = plausible(job.lastSeenAt, nowMs) ? Math.max(0, Math.floor((nowMs - job.lastSeenAt) / DAY)) : null;
    // only a source that re-lists its whole feed on every pull can say a job stopped appearing; a search API returns a
    // sample per query, so a live job can simply miss today's sample
    if (lastSeenDays != null && lastSeenDays > 7 && SAMPLED_SOURCES.indexOf(lc(str(job.source)).trim()) === -1) { pts += 2; reasons.push('not seen live in ' + lastSeenDays + ' days'); }
    var ghost = pts >= 4 ? 'high' : (pts >= 2 ? 'elevated' : 'low');
    var freshMult = { 'new': 1, fresh: 1, recent: 0.96, aging: 0.88, old: 0.75, unknown: 0.92 }[fresh];
    var ghostMult = { low: 1, elevated: 0.9, high: 0.72 }[ghost];
    var host = (str(job.applyUrl).match(/^https?:\/\/([^\/?#]+)/i) || [])[1] || '';
    host = lc(host);
    var route = !host ? 'unknown' : (TAX.ats_domains.some(function (d) { return host === d || host.slice(-d.length - 1) === '.' + d; }) ? 'employer' : (TAX.aggregator_domains.some(function (d) { return host === d || host.slice(-d.length - 1) === '.' + d; }) ? 'aggregator' : 'company_site'));
    return {
      ageDays: ageDays, ageSource: ageSource, freshness: fresh, lastSeenDays: lastSeenDays,
      ghost: ghost, ghostPoints: pts, ghostReasons: reasons,
      quality: freshMult * ghostMult, freshMult: freshMult, ghostMult: ghostMult,
      salaryTransparency: job.salary.source === 'listed' || job.salary.source === 'parsed' ? 'disclosed' : (job.salary.source === 'estimated' ? 'estimated' : 'none'),
      applyRoute: route, applyHost: host,
      repostCount: rc, originalPostedAt: orig,
    };
  }

  /* -------------------------------------------------------------- prefs */
  function defaultPrefs() {
    return {
      v: 1,
      targetRoles: [], years: null, education: null, level: null, extraSkills: [],
      needsSponsorship: false, citizen: null, permanentResident: false, clearance: false,
      modes: [], modeRule: 'rank', locations: '', relocate: false, locationRule: 'rank',
      salaryFloor: null, salaryTarget: null, salaryRule: 'rank', hideNoSalary: false,
      levels: [], levelRule: 'rank', maxYears: null, yearsRule: 'rank',
      types: [], typeRule: 'rank', authRule: 'hide',
      postedWithin: null, hideReposts: false, ghostRule: 'rank', hideAgencies: false, hideEvergreen: true, hideThin: false,
      blockedCompanies: [], dreamCompanies: [],
      industries: [], industryRule: 'rank', avoidIndustries: [],
      mustSkills: [], mustSkillsMode: 'any', skillsMore: [], skillsAvoid: [],
      excludeKeywords: [], excludeIn: 'title', excludePhrases: [], excludeRoles: [], keywords: [],
      salaryCeiling: null, excludeSkills: [], excludePlaces: [], companies: [], rankKeywords: [], avoidManagement: false, onlyRoles: [], onlyRolesRule: 'hide',
      excludeModes: [], excludeLevels: [], excludeTypes: [],
      maxTravel: null, minFit: 0,
      weights: { skills: 45, level: 20, role: 30, industry: 5 },
      prefWeight: 25, freshness: 50, diversity: true, sort: 'best',
    };
  }
  function mergePrefs(base, patch) {
    var out = defaultPrefs();
    [base, patch].forEach(function (src) {
      if (!src || typeof src !== 'object') return;
      Object.keys(src).forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(out, k)) return;
        var v = src[k];
        if (v === undefined) return;
        if (k === 'weights' && v && typeof v === 'object') { var w = {}; Object.keys(out.weights).forEach(function (wk) { w[wk] = isNum(v[wk]) ? clamp(v[wk], 0, 100) : out.weights[wk]; }); out.weights = w; return; }
        if (Array.isArray(out[k])) { if (Array.isArray(v)) out[k] = v.slice(0, PREF_LIST_CAP); return; }
        out[k] = v;
      });
    });
    return out;
  }

  // A search (or a saved search) layers its own constraints over your saved
  // preferences: exclusion lists add up, everything else is overridden.
  var UNION_KEYS = ['excludeKeywords', 'excludePhrases', 'excludeRoles', 'keywords', 'blockedCompanies', 'dreamCompanies', 'avoidIndustries', 'mustSkills', 'skillsMore', 'skillsAvoid', 'excludeSkills', 'excludePlaces', 'companies', 'rankKeywords', 'excludeModes', 'excludeLevels', 'excludeTypes'];
  var PREF_LIST_CAP = 200;   // the longest list the page lets you build for one filter (and what the server stores)
  // what a search asks for beats a standing "never" for the same thing, and the other way round
  var PREF_CONFLICTS = [['modes', 'excludeModes'], ['levels', 'excludeLevels'], ['types', 'excludeTypes'], ['companies', 'blockedCompanies'], ['industries', 'avoidIndustries'], ['mustSkills', 'excludeSkills']];
  function composePrefs(base, patch) {
    var out = mergePrefs(base, null);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return out;
    var over = {};
    Object.keys(patch).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(out, k)) return;
      var v = patch[k];
      if (v === undefined) return;
      if (UNION_KEYS.indexOf(k) !== -1 && Array.isArray(v)) {
        var u = uniq(out[k].concat(v));
        over[k] = u.length > PREF_LIST_CAP ? uniq(v.concat(out[k])).slice(0, PREF_LIST_CAP) : u;   // the search's own values always make it in
      } else over[k] = v;
    });
    var res = mergePrefs(out, over);
    PREF_CONFLICTS.forEach(function (pr) {
      var pos = pr[0], neg = pr[1], org = pos === 'companies';
      function same(a, b) { return org ? normOrg(a) === normOrg(b) : a === b; }
      var pp = Array.isArray(patch[pos]) && patch[pos].length ? patch[pos] : null, pn = Array.isArray(patch[neg]) && patch[neg].length ? patch[neg] : null;
      if (pp) res[neg] = res[neg].filter(function (x) { return !pp.some(function (y) { return same(x, y); }); });
      else if (pn) res[pos] = res[pos].filter(function (x) { return !pn.some(function (y) { return same(x, y); }); });
    });
    if (isNum(res.salaryFloor) && isNum(res.salaryCeiling) && res.salaryFloor > res.salaryCeiling) {
      if (isNum(patch.salaryCeiling) && !isNum(patch.salaryFloor)) res.salaryFloor = null;
      else if (isNum(patch.salaryFloor) && !isNum(patch.salaryCeiling)) res.salaryCeiling = null;
    }
    return res;
  }
  // whole words; a hyphen is a space; a plural "s" either way ("night shift" ~ "night-shifts")
  function qHyph(x) { return x.indexOf('-') === -1 ? x : x.replace(/-/g, ' ').replace(/\s+/g, ' '); }
  function phraseIn(lowN, k) {
    if (!k) return false;
    if (hasWord(lowN, k)) return true;
    var n = k.length, last = k.charAt(n - 1);
    if (/[a-z]/.test(last) && last !== 's' && hasWord(lowN, k + 's')) return true;
    if (n >= 6 && last === 's' && k.charAt(n - 2) !== 's' && hasWord(lowN, k.slice(0, -1))) return true;
    return false;
  }
  function placeSet(list) {
    var o = { metros: [], states: [] };
    (Array.isArray(list) ? list : []).forEach(function (x) {
      var P = parseUserLocation(x);
      if (P.metros.length) P.metros.forEach(function (m) { if (o.metros.indexOf(m) === -1) o.metros.push(m); });
      else P.states.forEach(function (st) { if (o.states.indexOf(st) === -1) o.states.push(st); });
    });
    return o;
  }

  /* -------------------------------------------------------------- filters */
  var PREF_KEYS = ['mode', 'location', 'salary', 'type', 'industry'];
  // "rank lower" has to be felt: a pay or place miss also lowers the preference score, so these stay moderate
  var SOFT_PEN = { mode: 0.8, location: 0.8, salary: 0.7, type: 0.9, industry: 0.9 };
  var RULE_PEN = { mode: 0.8, location: 0.75, salary: 0.8, level: 0.8, years: 0.8, type: 0.85, auth: 0.5, industry: 0.85, onlyrole: 0.75 };
  function orgMatch(job, list) { var o = normOrg(job.org); if (!o) return null; for (var i = 0; i < list.length; i++) { var x = normOrg(list[i]); if (x && (o === x)) return list[i]; } return null; }
  function evaluateFilters(job, sc, opp, prefs, learned, ctx) {
    var hide = [], pen = [], boost = [], soft = [];
    ctx = ctx || {};
    // sub names which of a key's rules fired (pay floor / ceiling / no pay listed), so each rule's count is its own
    function rule(r, key, why, sub) {
      var e;
      if (r === 'hide') { e = { key: key, why: why }; hide.push(e); }
      else if (PREF_KEYS.indexOf(key) === -1) { e = { key: key, why: why, mult: RULE_PEN[key] || 0.85 }; pen.push(e); }
      // location / mode / pay / type misses already lower the rank through your
      // preference score - counting them twice would bury good jobs. They're
      // still listed (soft) so the card and the filter counts can say so.
      else { e = { key: key, why: why, mult: SOFT_PEN[key] }; soft.push(e); }
      if (sub) e.sub = sub;
    }
    var bc = orgMatch(job, prefs.blockedCompanies || []);
    if (bc) hide.push({ key: 'company', why: 'You blocked ' + job.org });
    var only = prefs.companies || [];
    if (only.length && !orgMatch(job, only)) hide.push({ key: 'onlyco', why: 'Not at ' + only.slice(0, 3).join(' or ') + (only.length > 3 ? ' (or ' + (only.length - 3) + ' more)' : '') });
    var titleL = lc(job.title), allL = lc(job.title + ' ' + job.org + ' ' + job.description), titleN = null, allN = null;
    function tN() { if (titleN == null) titleN = qHyph(titleL); return titleN; }
    function aN() { if (allN == null) allN = qHyph(allL); return allN; }
    (prefs.excludeKeywords || []).forEach(function (k) {
      var kl = kwNorm(k); if (!kl) return;
      if (phraseIn(prefs.excludeIn === 'anywhere' ? aN() : tN(), kl)) hide.push({ key: 'keyword', why: 'Mentions "' + k + '"' + (prefs.excludeIn === 'anywhere' ? '' : ' in the title') });
    });
    (prefs.excludePhrases || []).forEach(function (k) {
      var kl = kwNorm(k); if (!kl) return;
      if (phraseIn(aN(), kl)) hide.push({ key: 'phrase', why: 'Mentions "' + k + '"' });
    });
    // a role you never want: judged by the job's main role, so "Sales Data Analyst" isn't a sales job
    var xr = prefs.excludeRoles || [];
    if (xr.length && job.roles.length && xr.indexOf(job.roles[0].id) !== -1) hide.push({ key: 'role', why: job.roles[0].name + ' — a role you excluded' });
    (prefs.keywords || []).forEach(function (k) {
      var kl = kwNorm(k); if (!kl) return;
      if (!phraseIn(aN(), kl)) hide.push({ key: 'mention', why: 'Doesn’t mention "' + k + '"' });
    });
    var qroles = (ctx.queryRoles || []).filter(function (r) { return !!idx().role[r]; });
    if (qroles.length) {
      var ok = job.roles.some(function (jr) { return qroles.some(function (q) { return roleSim(q, jr.id) >= 0.6; }); });
      if (!ok) hide.push({ key: 'search', why: 'Not a ' + qroles.map(function (r) { return idx().role[r].name; }).join(' / ') + ' role' });
    } else {
      // a role filter you kept from a search (a new search's roles replace it while it's on)
      var oroles = (prefs.onlyRoles || []).filter(function (r) { return typeof r === 'string' && !!idx().role[r]; });
      if (oroles.length && !job.roles.some(function (jr) { return oroles.some(function (q) { return roleSim(q, jr.id) >= 0.6; }); })) {
        var onames = oroles.slice(0, 3).map(function (r) { return idx().role[r].name; }).join(' / ') + (oroles.length > 3 ? ' (+' + (oroles.length - 3) + ')' : '');
        rule(prefs.onlyRolesRule === 'rank' ? 'rank' : 'hide', 'onlyrole', (job.roles.length ? job.roles[0].name : 'This role') + ' — not one of your roles (' + onames + ')');
      }
    }
    var modes = prefs.modes || [];
    if (modes.length && job.mode && modes.indexOf(job.mode) === -1) rule(prefs.modeRule, 'mode', (job.mode === 'onsite' ? 'On-site' : job.mode.charAt(0).toUpperCase() + job.mode.slice(1)) + ' — you want ' + modes.map(modeWord).join(' or '));
    var xm = prefs.excludeModes || [];
    if (xm.length && job.mode && xm.indexOf(job.mode) !== -1) hide.push({ key: 'xmode', why: modeName(job.mode) + ' — you said no ' + modeWord(job.mode) + ' jobs' });
    if (job.mode !== 'remote' && sc.pref.flags.outsideArea) rule(prefs.locationRule, 'location', (job.mode === 'hybrid' ? 'Hybrid' : 'On-site') + ' in ' + (cleanLoc(job.location) || 'another area') + ' — outside where you want to work');
    var xp = ctx.xPlaces || placeSet(prefs.excludePlaces);
    if ((xp.metros.length || xp.states.length) && job.mode !== 'remote' && job.places.length && job.places.every(function (p) { return (p.metro && xp.metros.indexOf(p.metro) !== -1) || (p.state && xp.states.indexOf(p.state) !== -1); })) hide.push({ key: 'place', why: (job.mode === 'hybrid' ? 'Hybrid in ' : (job.mode === 'onsite' ? 'On-site in ' : 'In ')) + (cleanLoc(job.location) || job.places[0].label) + ' — a place you excluded' });
    var top = job.salary.annualMax != null ? job.salary.annualMax : job.salary.annualMin;
    if (isNum(prefs.salaryFloor) && top != null && top < prefs.salaryFloor) rule(prefs.salaryRule, 'salary', payUpTo(job) + fmtK(top) + ' — under your $' + fmtK(prefs.salaryFloor) + ' floor', 'floor');
    var bottom = job.salary.annualMin != null ? job.salary.annualMin : job.salary.annualMax;
    if (isNum(prefs.salaryCeiling) && bottom != null && bottom > prefs.salaryCeiling) rule(prefs.salaryRule, 'salary', (job.salary.source === 'estimated' ? 'Estimated to start at $' : 'Starts at $') + fmtK(bottom) + ' — above your $' + fmtK(prefs.salaryCeiling) + ' limit', 'ceiling');
    if (prefs.hideNoSalary && top == null) hide.push({ key: 'salary', why: 'No pay listed', sub: 'nopay' });
    var lvls = prefs.levels || [];
    var bucket = levelBucket(job.level);
    if (lvls.length && bucket && lvls.indexOf(bucket) === -1) rule(prefs.levelRule, 'level', job.levelLabel + ' — outside the levels you picked');
    var xl = prefs.excludeLevels || [];
    if (xl.length && bucket && xl.indexOf(bucket) !== -1) hide.push({ key: 'xlevel', why: job.levelLabel + ' — a level you excluded' });
    if (isNum(prefs.maxYears) && job.yearsMin != null && !job.yearsPreferred && job.yearsMin > prefs.maxYears) rule(prefs.yearsRule, 'years', 'Asks for ' + job.yearsMin + '+ years (your max: ' + prefs.maxYears + ')');
    var types = prefs.types || [];
    if (types.length && job.employmentType && types.indexOf(job.employmentType) === -1) rule(prefs.typeRule, 'type', TYPE_NAMES[job.employmentType] + ' — not a type you picked');
    var xty = prefs.excludeTypes || [];
    if (xty.length && job.employmentType && xty.indexOf(job.employmentType) !== -1) hide.push({ key: 'xtype', why: TYPE_NAMES[job.employmentType] + ' — a job type you excluded' });
    var authBad = sc.caps.filter(function (c) { return (c.key === 'auth' && c.cap <= 25) || c.key === 'region'; });
    if (authBad.length) rule(prefs.authRule, 'auth', authBad[0].why);
    if (isNum(prefs.postedWithin) && prefs.postedWithin > 0) {
      if (opp.ageDays != null && opp.ageDays > prefs.postedWithin) hide.push({ key: 'fresh', why: 'Posted ' + opp.ageDays + ' days ago (you want ≤ ' + prefs.postedWithin + ')' });
    }
    if (prefs.hideReposts && opp.repostCount >= 1) hide.push({ key: 'repost', why: 'Reposted ' + opp.repostCount + (opp.repostCount === 1 ? ' time' : ' times') });
    if (prefs.ghostRule === 'hide' && opp.ghost === 'high') hide.push({ key: 'ghost', why: 'High ghost-job risk: ' + opp.ghostReasons.slice(0, 2).join('; ') });
    if (prefs.hideAgencies && job.agency.is) hide.push({ key: 'agency', why: 'Staffing agency post (' + job.agency.reasons[0] + ')' });
    if (prefs.hideEvergreen && job.evergreen.is) hide.push({ key: 'evergreen', why: 'Standing talent-pool post, not a specific opening' });
    if (prefs.hideThin && job.richness.descChars < 300) hide.push({ key: 'thin', why: 'Almost no description' });
    var ji = job.industries.map(function (d) { return d.id; });
    var av = (prefs.avoidIndustries || []).filter(function (d) { return ji.indexOf(d) !== -1; });
    if (av.length) hide.push({ key: 'industry', why: idx().ind[av[0]].name + ' — an industry you avoid', sub: 'avoid' });
    if ((prefs.industries || []).length && prefs.industryRule === 'only' && !ji.some(function (d) { return prefs.industries.indexOf(d) !== -1; })) hide.push({ key: 'industry', why: 'Not in your picked industries', sub: 'only' });
    var must = prefs.mustSkills || [];
    if (must.length) {
      var have = must.filter(function (m) { return job.skills.some(function (s) { return s.id === m || (idx().skill[s.id].implies || []).indexOf(m) !== -1; }); });
      var pass = prefs.mustSkillsMode === 'all' ? have.length === must.length : have.length > 0;
      if (!pass) hide.push({ key: 'skills', why: 'Doesn’t use ' + must.filter(function (m) { return have.indexOf(m) === -1; }).map(function (m) { return idx().skill[m] ? idx().skill[m].name : m; }).join(prefs.mustSkillsMode === 'all' ? ' and ' : ' or ') });
    }
    (prefs.excludeSkills || []).forEach(function (sid) {
      var hit = job.skills.filter(function (s) { return s.required && (s.id === sid || ((own(idx().skill, s.id) || {}).implies || []).indexOf(sid) !== -1); })[0];
      if (hit) hide.push({ key: 'xskill', why: 'Requires ' + hit.name + (hit.id === sid ? '' : ' (' + (own(idx().skill, sid) ? idx().skill[sid].name : sid) + ')') + ' — a skill you excluded' });
    });
    if (prefs.avoidManagement === true) {
      if (PEOPLE_MGR_TITLE.test(titleL) && !NOT_PEOPLE_MGR.test(titleL)) hide.push({ key: 'management', why: '"' + trunc(job.title, 60) + '" is a people-manager role' });
      else if (job.mgmt && job.mgmt.required) hide.push({ key: 'management', why: 'Asks you to manage people' + (job.mgmt.text ? ': "' + trunc(job.mgmt.text, 90) + '"' : '') });
    }
    if (isNum(prefs.maxTravel) && job.travel != null && job.travel > prefs.maxTravel) hide.push({ key: 'travel', why: 'Up to ' + job.travel + '% travel (your max: ' + prefs.maxTravel + '%)' });
    if (isNum(prefs.minFit) && prefs.minFit > 0 && sc.fit != null && sc.fit < prefs.minFit) hide.push({ key: 'minfit', why: 'Fit ' + sc.fit + ' is below your minimum of ' + prefs.minFit });
    (prefs.skillsAvoid || []).forEach(function (sid) { var hit = job.skills.filter(function (s) { return s.id === sid && s.required; })[0]; if (hit) pen.push({ key: 'avoid_skill', why: 'Requires ' + hit.name + ', which you want less of', mult: 0.85 }); });
    (prefs.skillsMore || []).forEach(function (sid) { var hit = job.skills.filter(function (s) { return s.id === sid; })[0]; if (hit) boost.push({ key: 'more_skill', why: 'Uses ' + hit.name + ', which you want more of', mult: 1.05 }); });
    var dc = orgMatch(job, prefs.dreamCompanies || []);
    if (dc) boost.push({ key: 'dream', why: job.org + ' is on your dream list', mult: 1.08 });
    (prefs.rankKeywords || []).forEach(function (k) { var kl = kwNorm(k); if (kl && phraseIn(aN(), kl)) boost.push({ key: 'rankkw', why: 'Mentions "' + k + '" — a word you rank up', mult: 1.1 }); });
    if (prefs.needsSponsorship === true && job.auth && job.auth.sponsors) boost.push({ key: 'sponsor', why: 'Says it sponsors visas', mult: 1.1 });
    (Array.isArray(learned) ? learned : []).forEach(function (r) {
      if (!r || r.active === false) return;
      var eff = learnedEffect(r, job);
      if (eff === 'hide') hide.push({ key: 'learned', why: r.label, rule: r.id });
      else if (eff != null && eff < 1) pen.push({ key: 'learned', why: r.label, mult: eff, rule: r.id });
      else if (eff != null && eff > 1) boost.push({ key: 'learned', why: r.label, mult: eff, rule: r.id });
    });
    // a "rank lower" miss (place, mode, pay, type) already lowers the rank through your preference score,
    // so here it counts at half strength (x0.9 for a place outside your area, not x0.8 on top) - in full
    // only when preferences don't count toward rank at all (weight 0). Never the whole penalty twice.
    var softFull = isNum(prefs.prefWeight) && prefs.prefWeight <= 0;
    var pm = 1; pen.forEach(function (p) { pm *= p.mult; }); soft.forEach(function (p) { pm *= softFull ? p.mult : 1 - (1 - p.mult) / 2; }); pm = Math.max(0.4, pm);
    var bm = 1; boost.forEach(function (b) { bm *= b.mult; }); bm = Math.min(1.2, bm);
    return { hidden: hide.length > 0, hide: hide, penalties: pen, boosts: boost, soft: soft, mult: pm * bm };
  }

  /* ------------------------------------------------------------- learning */
  function learnedEffect(r, job) {
    switch (r.kind) {
      case 'block_company': return normOrg(job.org) === r.value ? 'hide' : null;
      case 'level_above': return job.level != null && isNum(r.value) && job.level >= r.value ? 0.85 : null;
      case 'level_below': return job.level != null && isNum(r.value) && job.level <= r.value ? 0.85 : null;
      case 'avoid_place': return job.mode !== 'remote' && job.places.some(function (p) { return p.metro === r.value || (!p.metro && p.state === r.value); }) ? 0.85 : null;
      case 'salary_floor': var top = job.salary.annualMax != null ? job.salary.annualMax : job.salary.annualMin; return top != null && isNum(r.value) && top < r.value ? 0.85 : null;
      case 'avoid_role': return job.roles.some(function (x) { return x.id === r.value; }) ? 0.8 : null;
      case 'avoid_skill': return job.skills.some(function (s) { return s.id === r.value && s.required; }) ? 0.88 : null;
      case 'like_role': return job.roles.some(function (x) { return x.id === r.value; }) ? 1.04 : null;
      case 'avoid_type': return job.employmentType === r.value ? 0.85 : null;
      default: return null;
    }
  }
  function learnFromDismiss(job, reason, sc, nowMs) {
    var I = idx(), r = null, t = nowMs || 0;
    if (reason === 'too_senior' && job.level != null) r = { kind: 'level_above', value: job.level, label: 'Rank ' + levelLabel(job.level).toLowerCase() + '+ roles lower' };
    else if (reason === 'too_junior' && job.level != null) r = { kind: 'level_below', value: job.level, label: 'Rank ' + levelLabel(job.level).toLowerCase() + ' and below lower' };
    else if (reason === 'location' && job.mode !== 'remote' && job.places.length) {
      var p = job.places[0], v = p.metro || p.state;
      if (v) r = { kind: 'avoid_place', value: v, label: 'Rank on-site roles in ' + (p.metro ? I.metro[p.metro].name : p.state) + ' lower' };
    } else if (reason === 'salary') {
      var top = job.salary.annualMax != null ? job.salary.annualMax : job.salary.annualMin;
      if (top != null) { var fl = Math.ceil((top + 1) / 5000) * 5000; r = { kind: 'salary_floor', value: fl, label: 'Rank roles paying under $' + fmtK(fl) + ' lower' }; }
    } else if (reason === 'not_my_field' && job.roles.length) r = { kind: 'avoid_role', value: job.roles[0].id, label: 'Rank ' + job.roles[0].name + ' roles lower' };
    else if (reason === 'company' && normOrg(job.org)) r = { kind: 'block_company', value: normOrg(job.org), label: 'Hide jobs at ' + job.org };
    else if (reason === 'skills' && sc && sc.skillDetail) {
      var miss = sc.skillDetail.filter(function (d) { return d.required && d.credit === 0; })[0];
      if (miss) r = { kind: 'avoid_skill', value: miss.id, label: 'Rank roles requiring ' + miss.name + ' lower' };
    } else if (reason === 'type' && job.employmentType) r = { kind: 'avoid_type', value: job.employmentType, label: 'Rank ' + TYPE_NAMES[job.employmentType].toLowerCase() + ' roles lower' };
    if (!r) return null;
    r.id = r.kind + ':' + r.value; r.active = true; r.createdAt = t; r.source = { title: job.title, org: job.org, reason: reason };
    return r;
  }
  function learnFromSave(job, nowMs) {
    if (!job.roles.length) return null;
    return { id: 'like_role:' + job.roles[0].id, kind: 'like_role', value: job.roles[0].id, label: 'Rank ' + job.roles[0].name + ' roles a little higher (you saved one)', active: true, createdAt: nowMs || 0, source: { title: job.title, org: job.org, reason: 'saved' } };
  }
  function mergeLearned(list, rule) {
    list = Array.isArray(list) ? list.slice() : [];
    if (!rule) return list;
    var i = list.findIndex(function (x) { return x && x.id === rule.id; });
    if (i >= 0) { list[i] = Object.assign({}, list[i], { active: true, source: rule.source }); return list; }
    list.push(rule);
    return list.slice(-40);
  }

  /* -------------------------------------------------------------- levers */
  // What would actually move a score? Re-score with one skill proven - only
  // skills the posting itself asks for. Years and degrees can't be wished into
  // existence, so they are never offered as levers.
  function withProvenSkill(cand, sid) {
    var I = idx(), sk = I.skill[sid];
    var skills = Object.assign({}, cand.skills);
    skills[sid] = { id: sid, name: sk.name, level: 'proven', evidence: 'what-if', source: 'what-if', via: null };
    (sk.implies || []).forEach(function (t) {
      if (I.skill[t] && (!skills[t] || lowPrior(skills[t].level) < 2)) skills[t] = { id: t, name: I.skill[t].name, level: 'proven', evidence: 'what-if', source: 'what-if', via: sk.name };
    });
    return Object.assign({}, cand, { skills: skills });
  }
  function scoreLevers(job, cand, prefs, opts, base) {
    var I = idx(), out = [], seen = {};
    base = base || scoreJob(job, cand, prefs, opts);
    if (base.fit == null) return { fit: null, levers: [] };
    base.skillDetail.forEach(function (d) {
      if (d.credit >= 1 || seen[d.id] || !I.skill[d.id]) return;
      seen[d.id] = 1;
      var s2 = scoreJob(job, withProvenSkill(cand, d.id), prefs, opts);
      var gain = (s2.fit || 0) - base.fit;
      if (gain <= 0) return;
      out.push({ id: d.id, name: d.name, required: !!d.required, now: d.how, gain: gain, fit: s2.fit,
        liftsCap: !!(base.capApplied && !(s2.capApplied && s2.capApplied.key === base.capApplied.key)) });
    });
    out.sort(function (a, b) { return b.gain - a.gain || (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)); });
    return { fit: base.fit, levers: out.slice(0, 6) };
  }
  function skillUnlocks(items, cand, prefs, opts) {
    // Across a set of jobs: which skill you don't yet prove would lift the most
    // of them into Strong (70+)? Exact re-scores, not guesses.
    var I = idx(), req = {}, order = [];
    (items || []).forEach(function (it) {
      if (!it || !it.score || it.score.fit == null) return;
      it.score.skillDetail.forEach(function (d) {
        if (d.credit >= 1 || !I.skill[d.id] || I.skill[d.id].kind === 'soft') return;
        if (!req[d.id]) { req[d.id] = []; order.push(d.id); }
        if (req[d.id].indexOf(it) === -1) req[d.id].push(it);
      });
    });
    order.sort(function (a, b) { return req[b].length - req[a].length || I.skill[a]._i - I.skill[b]._i; });
    return order.slice(0, 10).map(function (sid) {
      var c2 = withProvenSkill(cand, sid), gains = 0, toStrong = 0, ids = [];
      req[sid].forEach(function (it) {
        var s2 = scoreJob(it.job, c2, prefs, opts), g = (s2.fit || 0) - it.score.fit;
        gains += g;
        if (it.score.fit < 70 && s2.fit != null && s2.fit >= 70) { toStrong++; ids.push(it.job.id); }
      });
      var cs = cand.skills[sid], have = cs ? cs.level : 'missing';
      if (!cs) { var cr = skillCredit({ id: sid, family: I.skill[sid].family }, cand); if (cr.how === 'adjacent' || cr.how === 'related') have = cr.how; }
      return { id: sid, name: I.skill[sid].name, have: have, jobs: req[sid].length, avgGain: round1(gains / req[sid].length), toStrong: toStrong, toStrongIds: ids.slice(0, 20) };
    }).filter(function (x) { return x.avgGain > 0; }).sort(function (a, b) {
      return b.toStrong - a.toStrong || b.avgGain - a.avgGain || b.jobs - a.jobs || (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0));
    });
  }

  /* -------------------------------------------------------- pool & ranking */
  // the same posting under two titles and two write-ups (a job board's summary of the employer's ad):
  // same employer, same place, the same stated pay, titles that share almost every word and mostly the
  // same words in the text - one job. Any of those missing and they stay apart.
  function dupLooseKey(j) {
    var ck = str(j.canonicalKey); if (!ck || ck.charAt(0) === '#') return null;
    var sal = j.salary || {}; if (sal.annualMin == null || !sal.source || sal.source === 'estimated') return null;
    var p = ck.split('|'); return p[0] + '|' + p.slice(2).join('|') + '|' + sal.annualMin + '-' + (sal.annualMax != null ? sal.annualMax : '');
  }
  var DUP_SHIFT = /(?<![a-z])(nights?|days|evenings?|overnights?|weekends?|night shift|day shift|evening shift|prn|per diem)(?![a-z])/g;
  function dupTitleWords(t) { return uniq((normTitle(t).replace(DUP_SHIFT, ' ').match(/[a-z]{2,}/g) || [])); }
  var DUP_BOILER = /(equal (employment )?opportunity|without regard to|reasonable accommodation|e-verify|affirmative action|pay range|veteran status|protected (veteran|class)|eeo|drug[- ]free)/;
  function dupWordSet(t) { var o = dict(); lc(t).split(/\n+|(?<=[.!?])\s+/).filter(function (ln) { return !DUP_BOILER.test(ln); }).join(' \n ').replace(/[^a-z0-9]+/g, ' ').split(' ').forEach(function (w) { if (w.length >= 3) o[w] = 1; }); return o; }
  function dupOverlap(a, b) { var ka = Object.keys(a), kb = Object.keys(b); if (!ka.length || !kb.length) return 0; var n = 0; ka.forEach(function (w) { if (b[w]) n++; }); return n / Math.min(ka.length, kb.length); }
  function dupSameJob(a, b) {
    var A = dupTitleWords(a.title), B = dupTitleWords(b.title); if (!A.length || !B.length) return false;
    var both = A.filter(function (w) { return B.indexOf(w) !== -1; }).length;
    return both / Math.min(A.length, B.length) >= 0.8 && dupOverlap(dupWordSet(a.description), dupWordSet(b.description)) >= 0.5;
  }
  function dedupePool(jobs) {
    var groups = {}, order = [];
    jobs.forEach(function (j) { var k = j.canonicalKey; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(j); });
    var byLoose = {};
    order = order.filter(function (k) {
      var j0 = groups[k][0], lk = dupLooseKey(j0); if (lk == null) return true;
      var seen = byLoose[lk] || (byLoose[lk] = []);
      for (var i = 0; i < seen.length; i++) { if (dupSameJob(groups[seen[i]][0], j0)) { groups[seen[i]] = groups[seen[i]].concat(groups[k]); return false; } }
      seen.push(k); return true;
    });
    var out = [];
    order.forEach(function (k) {
      var g = groups[k];
      g.sort(function (a, b) { return (b.richness.descChars - a.richness.descChars) || ((b.postedAt || 0) - (a.postedAt || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
      var rep = g[0];
      if (g.length > 1) {
        var days = uniq(g.map(function (x) { return x.postedAt != null ? Math.floor(x.postedAt / DAY) : null; }).filter(function (d) { return d != null; })).sort(function (a, b) { return a - b; });
        var clusters = 0, last = null;
        days.forEach(function (d) { if (last == null || d - last > 7) clusters++; last = d; });
        var extra = Math.max(0, clusters - 1);
        rep = Object.assign({}, rep, {
          duplicates: g.slice(1).map(function (x) { return { id: x.id, source: x.source, postedAt: x.postedAt, applyUrl: x.applyUrl }; }),
          repostCount: Math.max(rep.repostCount || 0, extra) ,
          firstPostedAt: days.length ? days[0] * DAY : rep.postedAt,
        });
        if (extra > 0 && rep.postedAt != null && days.length) rep.originalPostedAt = days[0] * DAY;
      }
      out.push(rep);
    });
    return out;
  }

  function analyzePool(listings, profile, entries, prefs, learned, opts) {
    opts = opts || {};
    var now = isNum(opts.now) ? opts.now : 0;
    prefs = mergePrefs(prefs, null);
    var cand = buildCandidate(profile, entries, prefs, now);
    cand.country = opts.country || 'US';
    function idSet(v) { var o = dict(); if (Array.isArray(v)) v.forEach(function (x) { o[str(x)] = true; }); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { if (v[k]) o[k] = true; }); return o; }
    var dismissed = idSet(opts.dismissed), applied = idSet(opts.applied);
    learned = Array.isArray(learned) ? learned : [];
    var types = Array.isArray(opts.types) && opts.types.length ? opts.types : null;
    var parsed = [], typeSkipped = dict(), expired = 0;
    (listings || []).forEach(function (l) {
      if (!l) return;
      var j = (opts.parsedCache && own(opts.parsedCache, str(l.id))) || parseJob(l);
      // left out, and counted - so what's shown + hidden + left out always adds up to what was scanned
      if (types && types.indexOf(j.type) === -1) { typeSkipped[j.type] = (typeSkipped[j.type] || 0) + 1; return; }
      if (isExpired(j, now)) { expired++; return; }
      parsed.push(j);
    });
    var merged = dedupePool(parsed);
    // dismissed / applied: the whole duplicate group goes, so the same job can't sneak back from another site
    var pool = merged.filter(function (j) {
      if (dismissed[j.id] || applied[j.id]) return false;
      return !(j.duplicates || []).some(function (d) { return dismissed[d.id] || applied[d.id]; });
    });
    var ctx = { queryRoles: (opts.queryRoles || []).filter(function (r) { return !!idx().role[r]; }), xPlaces: placeSet(prefs.excludePlaces) };
    var items = pool.map(function (job) {
      var sc = scoreJob(job, cand, prefs, { queryRoles: ctx.queryRoles });
      var opp = assessOpportunity(job, now);
      var fl = evaluateFilters(job, sc, opp, prefs, learned, ctx);
      var fw = clamp(isNum(prefs.freshness) ? prefs.freshness : 50, 0, 100) / 100;
      var qf = 1 - fw + fw * opp.quality;
      var pw = clamp(isNum(prefs.prefWeight) ? prefs.prefWeight : 25, 0, 100) / 100;
      var pf = 1 - pw + pw * (sc.pref.score == null ? 1 : sc.pref.score / 100);
      var rank = sc.fit == null ? 0 : sc.fit * pf * qf * fl.mult;
      return { job: job, score: sc, opp: opp, filters: fl, rank: Math.floor(rank * 100 + 0.5) / 100, qualityFactor: Math.floor(qf * 1000 + 0.5) / 1000, prefFactor: Math.floor(pf * 1000 + 0.5) / 1000 };
    });
    var visible = items.filter(function (it) { return !it.filters.hidden; });
    var hidden = items.filter(function (it) { return it.filters.hidden; });
    sortItems(visible, prefs.sort || 'best');
    if (prefs.diversity !== false && (prefs.sort || 'best') === 'best') visible = diversify(visible, 2, 10);
    hidden.sort(function (a, b) { return (b.score.fit || 0) - (a.score.fit || 0) || cmpId(a, b); });
    var hideCounts = dict();
    hidden.forEach(function (it) { it.filters.hide.forEach(function (h) { hideCounts[h.key] = (hideCounts[h.key] || 0) + 1; }); });
    return { candidate: cand, prefs: prefs, items: items, visible: visible, hidden: hidden, hideCounts: hideCounts, scanned: (listings || []).length, deduped: parsed.length - merged.length, poolSize: pool.length,
      typeSkipped: typeSkipped, expired: expired, excluded: merged.length - pool.length };
  }
  function cmpId(a, b) { return a.job.id < b.job.id ? -1 : (a.job.id > b.job.id ? 1 : 0); }
  function sortItems(arr, sort) {
    arr.sort(function (a, b) {
      var d = 0;
      if (sort === 'fit') d = (b.score.fit || 0) - (a.score.fit || 0);
      else if (sort === 'newest') d = (a.opp.ageDays == null ? 1e9 : a.opp.ageDays) - (b.opp.ageDays == null ? 1e9 : b.opp.ageDays);
      else if (sort === 'salary') d = ((b.job.salary.annualMax || b.job.salary.annualMin || 0) - (a.job.salary.annualMax || a.job.salary.annualMin || 0));
      else if (sort === 'closing') d = deadlineKey(a.job) - deadlineKey(b.job);
      else d = b.rank - a.rank;
      if (d) return d;
      d = (b.score.fit || 0) - (a.score.fit || 0); if (d) return d;
      d = (a.opp.ageDays == null ? 1e9 : a.opp.ageDays) - (b.opp.ageDays == null ? 1e9 : b.opp.ageDays); if (d) return d;
      return cmpId(a, b);
    });
    return arr;
  }
  function deadlineKey(job) { var t = parseTime(job.deadline); return t == null ? 9e15 : t; }
  function isExpired(job, now) {
    if (!job.deadline || !now) return false;
    var t = parseTime(job.deadline);
    if (t == null) return false;
    return t + DAY <= now;
  }
  function diversify(arr, perOrg, window) {
    var res = [], deferred = [], count = {};
    arr.forEach(function (it, i) {
      var o = normOrg(it.job.org) || it.job.id;
      if ((count[o] || 0) >= perOrg && res.length < window) { deferred.push({ it: it, i: i }); return; }
      count[o] = (count[o] || 0) + 1;
      res.push({ it: it, i: i });
    });
    if (!deferred.length) return arr;
    var head = res.slice(0, window), tail = res.slice(window).concat(deferred).sort(function (a, b) { return a.i - b.i; });
    return head.concat(tail).map(function (x) { return x.it; });
  }

  /* ------------------------------------------------- natural-language search */
  // Plain English in, editable chips out. Chips are rebuilt FROM the patch
  // (chipsFromPatch), so a chip always says what is really applied. "No X",
  // "not X or Y", "anything but X" and "I don't want X" never turn into "only X";
  // words we can't place only rank (never hide); "quoted words" must appear.
  var Q_STOP = ['requirements', 'requirement', 'required', 'requiring', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jobs', 'job', 'roles', 'role', 'positions', 'position', 'opportunities', 'opportunity', 'in', 'at', 'for', 'a', 'an', 'the', 'and', 'or', 'with', 'near', 'paying', 'that', 'pay', 'pays', 'salary', 'find', 'me', 'show', 'looking', 'want', 'i', 'work', 'working', 'company', 'companies', 'openings', 'opening', 'hiring', 'of', 'to', 'on', 'who', 'my', 'some', 'any', 'please', 'which', 'where', 'like', 'something', 'based', 'around', 'only', 'just', 'least', 'more', 'than', 'over', 'above', 'under', 'per', 'year', 'annually', 'is', 'are', 'be', 'can', 'could', 'would', 'should', 'get', 'good', 'great', 'best', 'new', 'next', 'within', 'days', 'day', 'week', 'posted', 'type', 'level', 'from', 'all', 'it', 'its', 'help', 'need', 'needs', 'having', 'have', 'has', 'them', 'they', 'you', 'your', 'also', 'into', 'out', 'up', 'via', 'as', 'by', 'k', 'usd',
    'but', 'non', 'uses', 'use', 'using', 'nothing', 'older', 'newer', 'weeks', 'months', 'month', 'hours', 'hour', 'ote', 'thanks', 'thank', 'wanted', 'prefer', 'preferably', 'ideally', 'ok', 'okay', 'open', 'interested', 'experience', 'experienced', 'exp', 'yoe', 'years', 'yrs', 'listings', 'listing', 'posts', 'postings', 'post', 'stuff', 'things', 'thing', 'anything', 'everything', 'kind', 'sort', 'types', 'similar', 'related', 'etc', 'very', 'really', 'mostly', 'mainly', 'preferred', 'required', 'require', 'requires', 'needed', 'ideal', 'ones', 'one', 'those', 'these', 'this', 'there', 'here', 'what', 'when', 'how', 'do', 'does', 'doing', 'will', 'am', 'was', 'were', 'been', 'not', 'no', 'nor', 'then', 'too', 'so', 'such', 'other', 'others', 'else', 'either', 'both', 'each', 'every', 'few', 'many', 'much', 'lots', 'lot', 'search', 'searching', 'seeking', 'seek', 'apply', 'applying', 'hire', 'hired', 'currently', 'now', 'asap', 'immediately', 'start', 'starting', 'available', 'ever', 'yet', 'still', 'most', 'less', 'fewer', 'max', 'min', 'maximum', 'minimum', 'about', 'roughly', 'approximately', 'between', 'among', 'without', 'except', 'excluding', 'exclude', 'avoid', 'skip', 'never', 'zero', 'minus', 'old', 'recent', 'recently', 'today', 'must', 'want', 'wants', 'id', 'im', 'ive'];
  var Q_STOP_SET = null;
  function qStop(w) { if (!Q_STOP_SET) { Q_STOP_SET = dict(); Q_STOP.forEach(function (x) { Q_STOP_SET[x] = 1; }); } return !!Q_STOP_SET[w]; }
  var LEVEL_ORDER = ['intern', 'entry', 'mid', 'senior', 'lead', 'director', 'exec'];
  var Q_LEVEL_WORDS = [
    ['intern', 'internships?|interns?|co-?ops?'],
    ['entry', 'entry-level|junior|juniors|jr\\.?|new grads?|new graduates?|early[- ]career|graduate programs?|grad programs?|recent grads?|recent graduates?'],
    ['mid', 'mid-level|mid[- ]career|intermediate'],
    ['senior', 'senior|seniors|sr\\.?'],
    ['lead', 'staff|principal|lead(?!\\s*gen)'],
    ['director', 'directors?|head of'],
    ['exec', 'vp|vps|vice presidents?|svp|evp|c-suite|c-level|chief [a-z]+ officer'],
  ];
  var Q_TYPE_WORDS = [
    ['full_time', 'full-time|permanent|fte'],
    ['part_time', 'part-time|per diem|prn'],
    ['contract', 'contract[- ]to[- ]hire|contracts?|contractors?|contracting|c2h|freelance|freelancers?|freelancing|1099|gigs?'],
    ['temporary', 'temp[- ]to[- ]hire|temps?|temporary|seasonal'],
  ];
  var Q_MODE_WORDS = [['remote', 'remote|remotely'], ['hybrid', 'hybrid'], ['onsite', 'onsite']];
  var Q_LEVEL_RE = Q_LEVEL_WORDS.map(function (x) { return [x[0], new RegExp('(?<![a-z])(' + x[1] + ')(?![a-z])', 'g'), new RegExp('^(?:' + x[1] + ')(?:[- ]level)?$')]; });
  var Q_TYPE_RE = Q_TYPE_WORDS.map(function (x) { return [x[0], new RegExp('(?<![a-z])(' + x[1] + ')(?![a-z])', 'g'), new RegExp('^(?:' + x[1] + ')(?: work)?$')]; });
  var Q_MODE_RE = Q_MODE_WORDS.map(function (x) { return [x[0], new RegExp('(?<![a-z])(' + x[1] + ')(?![a-z])', 'g'), new RegExp('^(?:' + x[1] + ')(?: work| only| first| schedule)?$')]; });
  var Q_LEVEL_UP = { intern: ['intern'], entry: ['intern', 'entry'], mid: ['mid'], senior: ['senior', 'lead', 'director', 'exec'], lead: ['lead', 'director', 'exec'], director: ['director', 'exec'], exec: ['exec'] };
  // words that say the same thing a few ways become one token first
  var Q_CANON = [
    [/(?<![a-z])(?:fully[- ]remote|100% remote|remote[- ]first|work(?:ing)?[- ]from[- ]home|wfh|telecommut(?:e|ing)|telework(?:ing)?)(?![a-z])/g, 'remote'],
    [/(?<![a-z])(?:on[- ]site|in[- ]office|in[- ]person|office[- ]based)(?![a-z])/g, 'onsite'],
    [/(?<![a-z])full[- ]?time(?![a-z])/g, 'full-time'],
    [/(?<![a-z])part[- ]?time(?![a-z])/g, 'part-time'],
    [/(?<![a-z])entry[- ]level(?![a-z])/g, 'entry-level'],
    [/(?<![a-z])mid[- ]level(?![a-z])/g, 'mid-level'],
  ];
  var Q_NORM = [
    [/(?<![a-z])w\/o(?![a-z])/g, 'without'],
    [/(?<![a-z])no-(?=[a-z])/g, 'no '],
    // "I don't need sponsorship" is about you, not a filter
    [/(?<![a-z])(?:i\s+|we\s+)?(?:really\s+)?(?:do\s+not|don'?t|won'?t|will\s+not)\s+(?:need|require)\s+(?:a\s+|any\s+)?(?:visa\s+|h-?1b\s+)?(?:sponsorship|sponsor|visa)(?![a-z])/g, ' '],
    [/(?<![a-z])(?:no|without|not)\s+(?:needing\s+|requiring\s+)?(?:visa\s+|h-?1b\s+)?sponsorship(?:\s+(?:needed|required|necessary))?(?![a-z])/g, ' '],
    [/(?<![a-z])neither\s+/g, ' no '],
    [/(?<![a-z0-9])(?:four|4)[- ]day\s+(?:work\s*)?(?:weeks?|workweeks?)(?![a-z])/g, ' 4-day '],
    [/(?<![a-z])(?:i\s+|we\s+)?(?:really\s+)?(?:do\s+not|don'?t|won'?t|will\s+not|would\s+not|wouldn'?t)\s+(?:want|like|do|consider|take|accept)(?:\s+to\s+(?:work|be|do)(?:\s+(?:in|on|at|for|with|as))?)?(?:\s+(?:any|a|an))?\s+/g, ' no '],
    [/(?<![a-z])(?:that\s+|which\s+|who\s+)?(?:do\s+not|does\s+not|don'?t|doesn'?t)\s+(?:need|require|requires|ask\s+for|involve|include|use|mention)(?:\s+(?:any|a|an))?\s+/g, ' no '],
    [/(?<![a-z])(?:i'?m\s+|i\s+am\s+|am\s+)?not\s+(?:interested\s+in|into|looking\s+for|a\s+fan\s+of|keen\s+on|open\s+to)\s+/g, ' no '],
    [/(?<![a-z])(?:i\s+|we\s+)?(?:hate|dislike|loathe|despise)\s+/g, ' no '],
    [/(?<![a-z])(?:anything|everything|any\s+jobs?|anywhere|any\s+place|any\s+location|any\s+industry|any\s+company|any\s+role)\s+(?:but|except(?:\s+for)?|other\s+than|outside(?:\s+of)?|besides|apart\s+from)\s+/g, ' no '],
    [/(?<![a-z])(?:other\s+than|apart\s+from|aside\s+from|besides|except\s+for)\s+/g, ' no '],
    // "nothing in sales", "none in sales or marketing", "nothing to do with healthcare"
    [/(?<![a-z])(?:nothing|none)\s+(?:at\s+all\s+)?(?:in|to\s+do\s+with|related\s+to|involving|with|from|at)\s+/g, ' no '],
    // "stay away from sales", "steer clear of agencies", "keep me away from night shifts"
    [/(?<![a-z])(?:stay|keep(?:\s+me)?|steer)\s+(?:far\s+)?(?:away\s+from|clear\s+of)\s+/g, ' no '],
    // "no jobs that require relocation", "no roles requiring travel", "no jobs posted by staffing agencies"
    [/(?<![a-z])(?:no|not|without|exclude|excluding|avoid|avoiding|never|skip)\s+(?:jobs?|roles?|positions?|openings?|work|listings?|posts?|postings?|anything)\s+(?:that\s+|which\s+)?(?:require|requires|requiring|need|needs|needing|involve|involves|include|includes|including|mention|mentions|mentioning|posted\s+by|offered\s+by|listed\s+by)\s+(?:a\s+|an\s+|any\s+)?/g, ' no '],
  ];
  var Q_RELOC_PERK = /(?<![a-z])(?:(?:relocation|relo)\s+(?:assistance|package|support|bonus|stipend|help|benefits?|paid|covered)|(?:paid|covered)\s+relocation)(?![a-z])/g;
  var Q_RELOC_NO = /(?<![a-z])(?:(?:i\s+|we\s+)?(?:am\s+|'m\s+)?(?:no|not|never|without|don'?t\s+want\s+to|do\s+not\s+want\s+to|won'?t|will\s+not|can'?t|cannot|unable\s+to|not\s+willing\s+to|not\s+able\s+to|not\s+open\s+to|unwilling\s+to)\s+(?:to\s+)?(?:relocat(?:e|ing|ion)|move|moving))(?![a-z])/g;
  var Q_RELOC_YES = /(?<![a-z])(?:(?:open\s+to|willing\s+to|happy\s+to|can|will|able\s+to|ready\s+to|okay\s+with|ok\s+with|fine\s+with)\s+(?:relocat(?:e|ing|ion)|move|moving)|relocation\s+(?:is\s+)?(?:ok|okay|fine))(?![a-z])/g;
  var Q_NO_DEGREE = /(?<![a-z])(?:no\s+(?:a\s+|an\s+|any\s+)?(?:college\s+|4-year\s+|four-year\s+|bachelor'?s\s+|university\s+)?degrees?(?:\s+(?:required|needed|necessary))?|without\s+(?:a\s+)?degree|degree\s+not\s+(?:required|needed|necessary))(?![a-z])/g;
  var Q_NO_COMMUTE = /(?<![a-z])no\s+commut(?:e|ing)(?![a-z])/g;
  var Q_IC = /(?<![a-z])(?:individual[- ]contributor(?:\s+(?:roles?|positions?|jobs?|track|only))?|ic\s+(?:roles?|positions?|jobs?|track|only)|non[- ]management|non[- ]managerial|non[- ]manager)(?![a-z])/g;
  // we can't tell a company's size from a posting - say so instead of guessing
  var Q_URL = /(?:https?:\/\/|www\.)[^\s"]+/g;   // a pasted link
  var Q_SIZE = /(?<![a-z])(?:big|large|huge|small|tiny|mid-?sized?|medium-?sized?|fortune\s+500|enterprise-?size[d]?)\s+(?:companies|company|firms?|employers?|orgs?|organi[sz]ations?|businesses|corporations?)(?![a-z])/g;
  var Q_GENERIC_ORG = ['inc', 'llc', 'ltd', 'co', 'corp', 'corporation', 'company', 'group', 'holdings', 'labs', 'lab', 'solutions', 'technologies', 'technology', 'tech', 'systems', 'services', 'global', 'international', 'partners', 'consulting', 'software', 'digital', 'health', 'care', 'healthcare', 'media', 'studio', 'studios', 'network', 'networks', 'enterprises', 'industries', 'america', 'americas', 'usa', 'the', 'and', 'remote', 'remotely', 'hybrid', 'onsite', 'office', 'senior', 'junior', 'staff', 'lead', 'principal', 'intern', 'interns', 'internship', 'internships', 'entry', 'mid', 'director', 'head', 'executive', 'contract', 'contractor', 'freelance', 'temp', 'temporary', 'seasonal', 'permanent', 'part', 'full', 'time', 'confidential', 'unknown', 'stealth', 'startup', 'private', 'employer', 'anonymous', 'client', 'agency', 'staffing', 'recruiting', 'talent', 'careers', 'people', 'team', 'national', 'american', 'united', 'general', 'capital', 'financial', 'bank', 'insurance', 'foundation', 'institute', 'university', 'college', 'school', 'hospital', 'medical', 'center', 'clinic', 'city', 'county', 'state', 'department', 'data', 'analytics', 'cloud', 'smart', 'first', 'one', 'world', 'worldwide', 'sales', 'marketing', 'design', 'engineering'];
  var Q_GENERIC_SET = null;
  var Q_ORG_CUE = /(?:^|\s)(?:at|@|for|with|from|join|joining|no|not|without|exclude|excluding|except|avoid|avoiding|never|skip|minus)\s+$/;
  var Q_ROLE_SHORT_OK = /^(sdr|bdr|csm|tpm|apm|pmm|swe|sde|sre|ae|rn|lpn|cna|emt|ux|hr)$/;
  var Q_ROLE_ALIAS = { pm: 'product_manager', pms: 'product_manager', np: 'nurse', nps: 'nurse' };
  var Q_TITLE_NOUNS = ['analyst', 'engineer', 'designer', 'scientist', 'researcher'];
  var Q_POS_GROUP_WORDS = ['sales', 'marketing', 'operations', 'ops', 'hr', 'human resources', 'engineering', 'design', 'legal', 'admin', 'administrative', 'trades', 'skilled trades', 'writing', 'research', 'data'];
  var X_GROUPS = { sales: 'sales', marketing: 'marketing', engineering: 'engineering', 'software engineering': 'engineering', design: 'design', operations: 'operations', ops: 'operations', hr: 'people', 'human resources': 'people', 'customer service': 'customer', 'customer support': 'customer', admin: 'admin', administrative: 'admin', trades: 'trades', 'skilled trades': 'trades', legal: 'legal', writing: 'content', research: 'research', data: 'data' };
  var GROUP_LABEL = { engineering: 'engineering', physical_engineering: 'hardware engineering', data: 'data', finance: 'finance', product: 'product', operations: 'operations', design: 'design', marketing: 'marketing', sales: 'sales', customer: 'customer service', legal: 'legal', people: 'HR', consulting: 'consulting', admin: 'admin', it: 'IT', healthcare: 'healthcare', education: 'education', content: 'writing', research: 'research', trades: 'skilled trades', service: 'service', athletics: 'coaching', programs: 'fellowship', quality: 'QA testing', security: 'security', public_safety: 'public safety', nonprofit: 'nonprofit', real_estate: 'real estate', public_sector: 'public sector' };
  var Q_INDUSTRY_NAMES = { fintech: 'fintech', finance: 'fintech', banking: 'fintech', insurance: 'fintech', healthcare: 'healthcare', 'health care': 'healthcare', 'health tech': 'healthcare', healthtech: 'healthcare', 'digital health': 'healthcare', biotech: 'biotech', pharma: 'biotech', 'life sciences': 'biotech', edtech: 'edtech', education: 'edtech', 'e-commerce': 'ecommerce', ecommerce: 'ecommerce', retail: 'ecommerce', saas: 'saas', 'b2b saas': 'saas', 'enterprise software': 'saas', ai: 'ai', 'artificial intelligence': 'ai', 'ai startups': 'ai', media: 'media', entertainment: 'media', gaming: 'gaming', 'video games': 'gaming', government: 'government', 'public sector': 'government', nonprofit: 'nonprofit', 'non-profit': 'nonprofit', nonprofits: 'nonprofit', 'social impact': 'nonprofit', climate: 'climate', 'climate tech': 'climate', energy: 'climate', 'clean energy': 'climate', sustainability: 'climate', logistics: 'logistics', 'supply chain': 'logistics', manufacturing: 'manufacturing', 'real estate': 'real_estate', proptech: 'real_estate', hospitality: 'hospitality', travel: 'hospitality', consulting: 'consulting', cybersecurity: 'security', 'consumer tech': 'consumer_tech', telecom: 'telecom', 'legal tech': 'legal_services', food: 'food', sports: 'sports', fitness: 'sports' };
  var CLEARANCE_PHRASES = ['security clearance', 'clearance required', 'ts/sci', 'top secret'];
  var Q_ST_BAD_POS = ['in', 'or', 'me', 'oh', 'ok', 'hi', 'id', 'us'];
  var Q_ST_BAD_NEG = ['in', 'or', 'me', 'oh', 'ok', 'hi', 'id', 'us', 'co', 'de', 'al', 'ms', 'ma', 'pa', 'mo', 'md', 'mt', 'ar', 'ga', 'la'];
  var Q_NUMWORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, 'a couple of': 2, 'a couple': 2, 'couple of': 2, 'a few': 3, few: 3 };
  var NUMW = '([0-9]{1,3}|a couple of|a couple|couple of|a few|few|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|an|a)';
  function numv(t) { return /^[0-9]+$/.test(t) ? parseInt(t, 10) : (own(Q_NUMWORDS, t) || null); }
  // freshness
  var Q_FRESH_N = new RegExp('(?<![a-z])(?:(?:nothing|no|not|none)\\s+older\\s+than|(?:posted\\s+)?(?:with)?in\\s+(?:the\\s+)?(?:last|past)|(?:posted\\s+)?within|(?:in\\s+|over\\s+|from\\s+)?the\\s+(?:last|past)|last|past|(?:less|fewer)\\s+than|under|at\\s+most|up\\s+to|no\\s+more\\s+than)\\s+' + NUMW + '\\s+(hours?|hrs?|days?|weeks?|wks?|months?)(?:\\s+old)?(?![a-z])');
  var Q_FRESH_OLDER = new RegExp('(?<![a-z])older\\s+than\\s+' + NUMW + '\\s+(?:hours?|hrs?|days?|weeks?|wks?|months?)(?![a-z])');
  var Q_FRESH = [[1, /(?<![a-z])(today|last 24 hours|past 24 hours|past day|last day)(?![a-z])/g], [3, /(?<![a-z])(last (3|three) days|past (3|three) days|just posted|newly posted)(?![a-z])/g], [7, /(?<![a-z])(this week|last week|past week|last 7 days|past 7 days|last seven days|recently posted|posted recently)(?![a-z])/g], [14, /(?<![a-z])(last (2|two) weeks|past (2|two) weeks|last 14 days)(?![a-z])/g], [30, /(?<![a-z])(this month|last month|past month|last 30 days)(?![a-z])/g]];
  // years of experience
  var Q_YRS = '(?:years?|yrs?|yoe)';
  var Q_EXPW = '(?:\\s+(?:of\\s+)?(?:(?:work|professional|relevant|industry|prior|previous|related)\\s+)?(?:experience|exp)(?![a-z]))';
  var Q_YRS_ZERO = /(?<![a-z0-9.])(?:(?:no|zero|without)\s+(?:prior\s+|previous\s+|work\s+|professional\s+|relevant\s+)?(?:experience|exp)(?:\s+(?:needed|required|necessary))?|0\s+(?:years?|yrs?)(?:\s+(?:of\s+)?experience)?|experience\s+not\s+(?:needed|required|necessary))(?![a-z])/g;
  var Q_YRS_MIN = new RegExp('(?<![a-z])(?:no\\s+less\\s+than|not\\s+less\\s+than|at\\s+least|minimum(?:\\s+of)?|min\\.?|over|(?<!no\\s)(?<!not\\s)more\\s+than)\\s+' + NUMW + '\\s*\\+?\\s*' + Q_YRS + '(?![a-z])' + Q_EXPW + '?');
  var Q_YRS_RANGE = new RegExp('(?<![0-9.])([0-9]{1,2})\\s*(?:-|to)\\s*([0-9]{1,2})\\s*\\+?\\s*' + Q_YRS + '(?![a-z])' + Q_EXPW + '?');
  var Q_YRS_CEIL = new RegExp('(?<![a-z])(less\\s+than|fewer\\s+than|under|below|at\\s+most|no\\s+more\\s+than|not\\s+more\\s+than|up\\s+to|max(?:imum)?(?:\\s+of)?|<=?)\\s*' + NUMW + '\\s*\\+?\\s*' + Q_YRS + '(?![a-z])' + Q_EXPW + '?');
  var Q_YRS_POST = new RegExp('(?<![a-z0-9])' + NUMW + '\\s*\\+?\\s*' + Q_YRS + '(?![a-z])' + Q_EXPW + '?\\s+(?:or\\s+less|or\\s+fewer|or\\s+under|max(?:imum)?|at\\s+most|tops)(?![a-z])');
  var Q_YRS_HAVE = new RegExp('(?<![a-z])(?:i\\s+have|i\'ve\\s+got|i\\s+have\\s+got|with|have|having)\\s+(?:about\\s+|around\\s+|roughly\\s+|~\\s*)?' + NUMW + '\\s*\\+?\\s*' + Q_YRS + '(?![a-z])' + Q_EXPW + '?');
  var Q_YRS_BARE = new RegExp('(?<![a-z0-9])' + NUMW + '\\s*\\+?\\s*' + Q_YRS + '(?![a-z])' + Q_EXPW);
  // travel
  var Q_TRAVEL_W = '(?:travel|traveling|travelling)';
  var Q_TRAVEL = [
    [new RegExp('(?<![a-z])(?:no|zero|without|not)\\s+(?:any\\s+)?' + Q_TRAVEL_W + '(?:\\s+(?:required|needed|necessary|involved))?(?=\\s*(?:$|[,;.]|(?:and|or|but|please|jobs?|roles?|positions?|work)(?![a-z])))', 'g'), 0],
    [new RegExp('(?<![a-z])(?:little\\s+to\\s+no|little\\s+or\\s+no|minimal|minimum|little|light|limited|low|rare|infrequent)\\s+' + Q_TRAVEL_W + '(?![a-z])', 'g'), 10],
    [new RegExp('(?<![a-z])(?:occasional|some|moderate)\\s+' + Q_TRAVEL_W + '(?![a-z])', 'g'), 25],
  ];
  var Q_TRAVEL_PCT = new RegExp('(?<![a-z0-9])(?:(?:less\\s+than|under|below|up\\s+to|at\\s+most|no\\s+more\\s+than|max(?:imum)?(?:\\s+of)?|<=?)\\s*([0-9]{1,3})\\s*%\\s*(?:of\\s+(?:the\\s+)?time\\s+)?' + Q_TRAVEL_W + '|' + Q_TRAVEL_W + '\\s*(?:of\\s+)?(?:less\\s+than|under|below|up\\s+to|at\\s+most|no\\s+more\\s+than|max(?:imum)?(?:\\s+of)?|<=?)\\s*([0-9]{1,3})\\s*%|([0-9]{1,3})\\s*%\\s*' + Q_TRAVEL_W + '(?:\\s+(?:or\\s+less|max|at\\s+most))?)(?![a-z])');
  // distance: "within 50 miles of Austin" -> near Austin (metro areas already cover the commute belt)
  var Q_NEAR = /(?<![a-z])(?:(?:within|in)\s+(?:a\s+)?(?:[0-9]{1,3}|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|fifty|sixty)\s*(?:miles?|mi|km|kms|kilometers?|kilometres?|minutes?|mins?|hours?|hrs?)\s+(?:drive\s+time\s+|drive\s+|commute\s+|radius\s+)?(?:of|from|around|to)|[0-9]{1,3}\s*(?:miles?|mi|km)\s+(?:radius\s+of|radius\s+around|of|from|around)|(?:commutable|commuting\s+distance|driving\s+distance|close|nearby|near)\s+(?:to|of|from))\s+/g;
  // pay
  var Q_SAL_FLOOR = 'no\\s+less\\s+than|not\\s+less\\s+than|not\\s+below|not\\s+under|nothing\\s+below|nothing\\s+under|no\\s+lower\\s+than|at\\s+least|min(?:imum)?(?:\\s+of)?|more\\s+than|starting\\s+at|starting\\s+from|starts\\s+at|north\\s+of|upwards\\s+of|in\\s+excess\\s+of|over|above|from|>=?';
  var Q_SAL_CEIL = 'no\\s+more\\s+than|not\\s+more\\s+than|not\\s+above|not\\s+over|nothing\\s+above|nothing\\s+over|no\\s+higher\\s+than|less\\s+than|lower\\s+than|south\\s+of|at\\s+most|up\\s+to|max(?:imum)?(?:\\s+of)?|under|below|<=?';
  var Q_SAL_POSTF = '\\+|plus|or\\s+more|or\\s+above|or\\s+higher|and\\s+up|and\\s+above|minimum|min|at\\s+least';
  var Q_SAL_POSTC = 'or\\s+less|or\\s+below|or\\s+lower|or\\s+under|and\\s+under|and\\s+below|max(?:imum)?|at\\s+most|tops';
  var Q_SAL_FLOOR_ONLY = new RegExp('^(?:' + Q_SAL_FLOOR + ')$');
  var Q_SAL_POSTF_ONLY = new RegExp('^(?:' + Q_SAL_POSTF + ')$');
  var Q_SAL_HR = new RegExp('(?<![a-z0-9.$])(?:(' + Q_SAL_FLOOR + '|' + Q_SAL_CEIL + ')\\s*)?(\\$?)\\s?([0-9]{1,3}(?:\\.[0-9]{1,2})?)(?:\\s*(?:-|to)\\s*\\$?\\s?([0-9]{1,3}(?:\\.[0-9]{1,2})?))?\\s*(?:\\/\\s*|per\\s+|an\\s+|a\\s+)(?:hour|hr|h)(?![a-z])(?:\\s*(' + Q_SAL_POSTF + '|' + Q_SAL_POSTC + ')(?![a-z]))?', 'g');
  var Q_SAL_RANGE = /(?<![a-z0-9.$])(between\s+)?\$?\s?([0-9]{2,3}(?:\.[0-9])?)\s*(k|,000|000)?\s*(-|to|and)\s*\$?\s?([0-9]{2,3}(?:\.[0-9])?)\s*(k|,000|000)(?![0-9a-z])/g;
  var Q_SAL_ONE = new RegExp('(?<![a-z0-9.$])(?:(' + Q_SAL_FLOOR + '|' + Q_SAL_CEIL + ')\\s*)?(\\$?)\\s?([0-9]{2,3}(?:\\.[0-9])?)\\s*(k|,000|000)(?![0-9a-z])(?:\\s*(' + Q_SAL_POSTF + '|' + Q_SAL_POSTC + ')(?![a-z]))?', 'g');
  var Q_SAL_SIX = new RegExp('(?<![a-z])(?:(' + Q_SAL_FLOOR + '|' + Q_SAL_CEIL + ')\\s*)?(?:a\\s+)?(?:six|6)[- ]figures?(?:\\s+(?:salary|income|pay))?(?![a-z])', 'g');
  // "no X" scopes
  var Q_EXCL_LEAD = /(?<![a-z])(no|not|without|exclude|excluding|avoid|avoiding|never|skip|except)\s+(?:jobs?|roles?|positions?|openings?|work|listings?|posts?|postings?)\s+(at|in|with|from|for|as|on|involving)\s+/g;
  // "not at Amazon": a name after "at" is an employer even when no listing has it yet - unless it's a kind of employer or a time
  var Q_ORG_KIND = /^(?:(?:big|large|small|tiny|early[- ]stage|late[- ]stage|public|private|federal|local|tech)\s+)?(?:start-?ups?|agenc(?:y|ies)|banks?|tech|big\s+tech|faang|maang|non-?profits?|charit(?:y|ies)|government|hospitals?|clinics?|schools?|universit(?:y|ies)|colleges?|consultanc(?:y|ies)|consulting(?:\s+firms?)?|firms?|compan(?:y|ies)|corporations?|corporates?|enterprises?|retailers?|restaurants?|stores?|warehouses?|home|night|nights|weekends?|all|scale|random|once|first|least|most|times?)$/;
  var Q_NEG_RE = /(?<![a-z])(?:no|not|without|exclude|excluding|except|minus|skip|avoid|avoiding|never|zero)\s+/g;
  var Q_ITEM_PRE = /(?:(?:in|at|for|with|any|a|an|the|too|very|so|really|more|much|many|of|to|be|being|doing)\s+)*/y;
  var Q_WORD = '[a-z0-9§][a-z0-9&.+#\'\\/§-]*';
  var Q_ITEM_STOPW = '(?:and|or|nor|but|in|at|with|near|over|under|above|below|paying|that|which|who|posted|from|for|remote|hybrid|onsite|no|not|without|exclude|excluding|except|never|avoid|avoiding|skip|minus|zero|please|only|just|is|are)';
  var Q_ITEM = new RegExp(Q_WORD + '(?:\\s+(?!' + Q_ITEM_STOPW + '(?![a-z0-9]))' + Q_WORD + '){0,5}', 'y');
  var Q_SEP = /\s*(?:,\s*(?:(and\/or|and|or|nor)\s+)?|(and\/or|and|or|nor)\s+)/y;
  var Q_ITEM_POST = /\s+(?:jobs?|roles?|positions?|openings?|work|companies|company|industry|industries|stuff|things|please|anymore|related|heavy|focused|oriented|people|listings?|posts?|postings?|types?|requirements?|required|requiring)$/;
  var Q_POS_KINDS = { mode: 1, level: 1, type: 1, location: 1 };
  var Q_SPECIAL = [
    ['agencies', /^(?:(?:staffing|recruiting|recruitment)\s+)?(?:agenc(?:y|ies)|recruiters?|headhunters?|staffing(?:\s+(?:agencies|firms|companies))?|third[- ]party(?:\s+recruiters?)?|3rd[- ]party(?:\s+recruiters?)?)$/],
    ['reposts', /^(?:reposts?|re-?posted(?:\s+(?:jobs|posts|listings))?)$/],
    ['ghost', /^(?:ghost(?:\s+(?:jobs|posts|listings))?|ghosts|stale(?:\s+(?:jobs|posts|listings))?|old\s+(?:posts|listings|jobs)|fake(?:\s+(?:jobs|posts|listings))?)$/],
    ['evergreen', /^(?:evergreen(?:\s+(?:posts|jobs|listings|roles))?|talent\s+pools?|talent\s+communit(?:y|ies))$/],
    ['travel', /^(?:travel|traveling|travelling)$/],
    ['clearance', /^(?:(?:security|government|active|secret|top\s+secret)\s+)?clearances?(?:\s+required)?$|^(?:ts\/sci|top\s+secret)$/],
    ['management', /^(?:(?:people|team|staff)\s+)?management(?:\s+roles?)?$|^(?:managing(?:\s+(?:people|a\s+team|teams|others))?|managers?|manager\s+roles?|people\s+managers?|direct\s+reports|supervis(?:ing|ory|ion)(?:\s+roles?)?|leading\s+(?:a\s+)?teams?)$/],
  ];

  function rxTest(re, s) { re.lastIndex = 0; var r = re.test(s); re.lastIndex = 0; return r; }
  function qGeneric(t) { if (!Q_GENERIC_SET) { Q_GENERIC_SET = dict(); Q_GENERIC_ORG.forEach(function (x) { Q_GENERIC_SET[x] = 1; }); } return !!Q_GENERIC_SET[t]; }
  var Q_CS_LOW = null;
  function qCsLow() {
    // case-sensitive skill words ("Excel", "Spark", "SAS") are plain in a lower-case search box
    if (Q_CS_LOW) return Q_CS_LOW;
    var o = dict();
    TAX.skills.forEach(function (sk) { if (sk.kind === 'soft') return; (sk.cs || []).forEach(function (a) { var l = lc(a); if ((l.length >= 3 || l === 'js') && !Object.prototype.hasOwnProperty.call(o, l)) o[l] = sk.id; }); });
    Q_CS_LOW = o;
    return o;
  }
  function qParserWord(t) {
    var I = idx();
    return !!(own(I.roleMap, t) || own(I.aliasMap, t) || own(qCsLow(), t) || own(Q_INDUSTRY_NAMES, t) || own(X_GROUPS, t) || own(I.metroMap, t) || own(I.stateByName, t) || qStop(t) || qGeneric(t));
  }
  function qDistinctive(form) {
    var toks = form.split(/[^a-z0-9]+/);
    for (var i = 0; i < toks.length; i++) { var t = toks[i]; if (t.length >= 3 && !/^[0-9]+$/.test(t) && !qParserWord(t)) return true; }
    return false;
  }
  function titleCase(nm) { return nm.replace(/(^| )[a-z]/g, function (c) { return c.toUpperCase(); }); }
  function capFirst(x) { return x ? x.charAt(0).toUpperCase() + x.slice(1) : x; }
  function modeName(m) { return m === 'onsite' ? 'On-site' : capFirst(m); }
  function qPlaceOf(w, bad) {
    var I = idx(), mid = own(I.metroMap, w);
    if (mid) return I.metro[mid].name;
    if (own(I.stateByName, w)) return titleCase(w);
    if (/^[a-z]{2}$/.test(w) && own(TAX.us_states, w.toUpperCase()) && bad.indexOf(w) === -1) return w.toUpperCase();
    return null;
  }
  function qSkillOf(w) {
    var I = idx(), id = own(I.aliasMap, w) || own(qCsLow(), w) || null;
    if (!id && w.length > 3 && w.charAt(w.length - 1) === 's') id = own(I.aliasMap, w.slice(0, -1)) || null;
    return id && I.skill[id] && I.skill[id].kind !== 'soft' ? id : null;
  }
  function qRoleOf(w) {
    var I = idx(), a = own(Q_ROLE_ALIAS, w);
    if (a) return a;
    var r = own(I.roleMap, w) || (w.length > 3 && w.charAt(w.length - 1) === 's' ? own(I.roleMap, w.slice(0, -1)) : null);
    return r || null;
  }
  function qGroupIds(g) { return TAX.roles.filter(function (r) { return r.group === g; }).map(function (r) { return r.id; }); }
  function qNounIds(n) { var re = new RegExp('(?<![a-z])' + n + '(?![a-z])'); return TAX.roles.filter(function (r) { return re.test(lc(r.name)); }).map(function (r) { return r.id; }); }
  function qNounOf(w) { for (var i = 0; i < Q_TITLE_NOUNS.length; i++) { if (w === Q_TITLE_NOUNS[i] || w === Q_TITLE_NOUNS[i] + 's') return Q_TITLE_NOUNS[i]; } return null; }
  function qOrgFor(w, orgs) {
    if (!Array.isArray(orgs)) return null;
    var nw = normOrg(w);
    for (var i = 0; i < orgs.length; i++) { var o = str(orgs[i]).trim(); if (o && (lc(o) === w || (nw && normOrg(o) === nw))) return o; }
    return null;
  }
  // What "no X" most likely means, most specific first.
  function qClassify(w, found, orgs) {
    var ph = /^§([0-9]+)§$/.exec(w);
    if (ph) return { kind: 'company', org: found[parseInt(ph[1], 10)] };
    for (var i = 0; i < Q_SPECIAL.length; i++) if (Q_SPECIAL[i][1].test(w)) return { kind: 'special', what: Q_SPECIAL[i][0] };
    if (/^(?:cold\s+call(?:ing|s)?|commission(?:[- ]only|\s+based|\s+heavy)?|door[- ]to[- ]door|mlm|multi[- ]level\s+marketing)$/.test(w)) return { kind: 'phrase', w: w };
    for (i = 0; i < Q_MODE_RE.length; i++) if (Q_MODE_RE[i][2].test(w)) return { kind: 'mode', v: Q_MODE_RE[i][0] };
    if (/^(?:office|offices|the\s+office|office\s+jobs)$/.test(w)) return { kind: 'mode', v: 'onsite' };
    for (i = 0; i < Q_LEVEL_RE.length; i++) if (Q_LEVEL_RE[i][2].test(w)) return { kind: 'level', v: Q_LEVEL_RE[i][0] };
    for (i = 0; i < Q_TYPE_RE.length; i++) if (Q_TYPE_RE[i][2].test(w)) return { kind: 'type', v: Q_TYPE_RE[i][0] };
    var org = qOrgFor(w, orgs);
    if (org) return { kind: 'company', org: org };
    var pl = qPlaceOf(w, Q_ST_BAD_NEG);
    if (pl) return { kind: 'location', v: pl };
    var ind = own(Q_INDUSTRY_NAMES, w);
    if (ind) return { kind: 'industry', v: ind };
    var grp = own(X_GROUPS, w);
    if (grp) return { kind: 'role', ids: qGroupIds(grp) };
    var rid = qRoleOf(w);
    if (rid) return { kind: 'role', ids: [rid] };
    var noun = qNounOf(w);
    if (noun) return { kind: 'role', ids: qNounIds(noun) };
    var sid = qSkillOf(w);
    if (sid) return { kind: 'skill', v: sid };
    if (w.length >= 3 && !qStop(w) && /[a-z]/.test(w)) return { kind: 'phrase', w: w };
    return { kind: 'none' };
  }
  function qContinues(pk, k, sep) {
    if (sep === 'comma') return pk === k && !Q_POS_KINDS[k] && k !== 'phrase' && k !== 'none';
    if (sep === 'and') return pk === k;
    if (pk === k) return true;
    return !Q_POS_KINDS[k] && !Q_POS_KINDS[pk];
  }

  function parseQuery(q, opts) {
    opts = opts || {};
    var I = idx();
    var raw = str(q).trim();
    var rawCut = raw;
    if (raw.length > 400) { var cutAt = 400, cc = raw.charCodeAt(399); if (cc >= 0xD800 && cc <= 0xDBFF) cutAt = 399; rawCut = raw.slice(0, cutAt); }
    var patch = {}, roles = [], ignored = [], hard = [], rank = [], ignoredWhy = {};
    function addTo(key, vals) { patch[key] = uniq((patch[key] || []).concat(vals)); }
    function addRoles(ids) { ids.forEach(function (r) { if (roles.indexOf(r) === -1) roles.push(r); }); }
    var low0 = lc(rawCut).replace(/[‘’‛′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—−]/g, '-');
    // a pasted link isn't a search: its words (".../greenhouse.io/...") would read as skills or places
    var urlN = 0;
    low0 = low0.replace(Q_URL, function (u) { if (urlN++ < 3) { var t = trunc(u, 60); if (ignored.indexOf(t) === -1) { ignored.push(t); ignoredWhy[t] = 'url'; } } return ' '; });
    // "exact words" in quotes must appear in the posting
    var qm, QQ = /"([^"]{2,60})"/g;
    while ((qm = QQ.exec(low0)) !== null) { var qt = qm[1].replace(/\s+/g, ' ').trim(); if (qt.length >= 2 && hard.indexOf(qt) === -1) hard.push(qt); }
    var s = ' ' + low0.replace(/"([^"]{2,60})"/g, ' ').replace(/[!?"§]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    Q_NORM.forEach(function (x) { s = s.replace(x[0], x[1]); });
    Q_CANON.forEach(function (x) { s = s.replace(x[0], x[1]); });
    s = s.replace(/\s+/g, ' ');
    // things that read like "no X" but aren't exclusions
    if (rxTest(Q_RELOC_PERK, s)) { rank.push('relocation'); s = s.replace(Q_RELOC_PERK, ' '); }
    if (rxTest(Q_RELOC_NO, s)) { patch.relocate = false; patch.locationRule = 'hide'; s = s.replace(Q_RELOC_NO, ' '); }
    else if (rxTest(Q_RELOC_YES, s)) { patch.relocate = true; s = s.replace(Q_RELOC_YES, ' '); }
    if (rxTest(Q_NO_DEGREE, s)) { rank.push('no degree'); s = s.replace(Q_NO_DEGREE, ' '); }
    s = s.replace(Q_NO_COMMUTE, ' remote ');
    if (rxTest(Q_IC, s)) { patch.avoidManagement = true; s = s.replace(Q_IC, ' '); }
    var szm; Q_SIZE.lastIndex = 0;
    while ((szm = Q_SIZE.exec(s)) !== null) { ignored.push(szm[0].trim()); ignoredWhy[szm[0].trim()] = 'size'; }
    s = s.replace(Q_SIZE, ' ');
    // company names from the pool first - "Senior Helpers" is a company, not a level
    var found = [];
    if (Array.isArray(opts.orgs)) {
      var forms = [], seenF = dict();
      opts.orgs.forEach(function (o, oi) {
        o = str(o).trim(); if (!o) return;
        var lo = lc(o).replace(/[–—−]/g, '-').replace(/\s+/g, ' ');
        [lo, lo.replace(/[^a-z0-9)]+$/, ''), normOrg(o)].forEach(function (f) {
          f = f.trim();
          if (f.length < 3 || /^[0-9]+$/.test(f) || qStop(f) || own(seenF, f)) return;
          seenF[f] = 1; forms.push({ f: f, org: o, i: oi });
        });
      });
      forms.sort(function (a, b) { return b.f.length - a.f.length || (a.f < b.f ? -1 : (a.f > b.f ? 1 : 0)) || a.i - b.i; });
      forms.forEach(function (fo) {
        if (s.indexOf(fo.f) === -1) return;
        var safe = qDistinctive(fo.f) && !own(I.roleMap, fo.f) && !own(I.aliasMap, fo.f) && !own(Q_INDUSTRY_NAMES, fo.f) && !own(I.metroMap, fo.f) && !own(I.stateByName, fo.f) && !own(X_GROUPS, fo.f);
        var re = wordRe(fo.f, 'g'), out = '', last = 0, m;
        while ((m = re.exec(s)) !== null) {
          if (!safe && !Q_ORG_CUE.test(s.slice(0, m.index))) continue;
          var n = found.indexOf(fo.org); if (n === -1) { found.push(fo.org); n = found.length - 1; }
          out += s.slice(last, m.index) + ' §' + n + '§ ';
          last = m.index + m[0].length;
        }
        if (last) s = (out + s.slice(last)).replace(/\s+/g, ' ');
      });
    }
    // pay
    var floors = [], ceils = [], target = null, hourly = false, mm;
    Q_SAL_HR.lastIndex = 0;
    var sHr = s;
    while ((mm = Q_SAL_HR.exec(sHr)) !== null) {
      var hv = parseFloat(mm[3]), hv2 = mm[4] ? parseFloat(mm[4]) : null;
      if (!(hv >= 7 && hv <= 500)) continue;
      var hceil = (mm[1] && !Q_SAL_FLOOR_ONLY.test(mm[1])) || (mm[5] && !Q_SAL_POSTF_ONLY.test(mm[5]));
      hourly = true;
      if (hv2 != null && hv2 > hv && hv2 <= 500) { floors.push(rhu(hv * 2080)); target = rhu(hv2 * 2080); ceils.push(rhu(hv2 * 2080)); }
      else if (hceil) ceils.push(rhu(hv * 2080));
      else floors.push(rhu(hv * 2080));
      s = s.replace(mm[0], ' ');
    }
    Q_SAL_RANGE.lastIndex = 0;
    var sR = s;
    while ((mm = Q_SAL_RANGE.exec(sR)) !== null) {
      if (mm[4] === 'and' && !mm[1]) continue;
      var lo = parseFloat(mm[2]) * 1000, hi = parseFloat(mm[5]) * 1000;
      if (!(lo >= 15000 && hi > lo && hi <= 900000)) continue;
      floors.push(lo); target = hi; ceils.push(hi);
      s = s.replace(mm[0], ' ');
      break;
    }
    Q_SAL_ONE.lastIndex = 0;
    var sO = s;
    while ((mm = Q_SAL_ONE.exec(sO)) !== null) {
      var v = parseFloat(mm[3]) * 1000;
      if (!mm[2] && mm[3] === '401' && mm[4] === 'k') continue;   // a 401(k), not a salary
      if (!(v >= 15000 && v <= 900000)) continue;
      if ((mm[1] && !Q_SAL_FLOOR_ONLY.test(mm[1])) || (mm[5] && !Q_SAL_POSTF_ONLY.test(mm[5]))) ceils.push(v); else floors.push(v);
      s = s.replace(mm[0], ' ');
    }
    Q_SAL_SIX.lastIndex = 0;
    var sS = s;
    while ((mm = Q_SAL_SIX.exec(sS)) !== null) {
      if (mm[1] && !Q_SAL_FLOOR_ONLY.test(mm[1])) ceils.push(100000); else floors.push(100000);
      s = s.replace(mm[0], ' ');
    }
    var fl = floors.length ? Math.max.apply(null, floors) : null, ce = ceils.length ? Math.min.apply(null, ceils) : null;
    if (fl != null && ce != null && ce < fl) ce = null;
    if (fl != null) { patch.salaryFloor = fl; if (target != null && target > fl) patch.salaryTarget = target; }
    if (ce != null) patch.salaryCeiling = ce;
    if (fl != null || ce != null) { patch.salaryRule = 'hide'; if (hourly) patch.salaryUnit = 'hour'; }
    // years of experience
    if (rxTest(Q_YRS_ZERO, s)) { patch.maxYears = 0; patch.yearsRule = 'hide'; s = s.replace(Q_YRS_ZERO, ' '); }
    var ym = Q_YRS_MIN.exec(s);
    if (ym) { ignored.push(ym[0].trim()); ignoredWhy[ym[0].trim()] = 'years_min'; s = s.replace(ym[0], ' '); }
    if (patch.maxYears == null) {
      if ((ym = Q_YRS_RANGE.exec(s)) !== null) { var y1 = parseInt(ym[1], 10), y2 = parseInt(ym[2], 10); if (y2 >= y1 && y2 <= 30) { patch.maxYears = y2; patch.yearsRule = 'hide'; } s = s.replace(ym[0], ' '); }
      else if ((ym = Q_YRS_CEIL.exec(s)) !== null) { var yc = numv(ym[2]); if (yc != null && yc <= 30) { patch.maxYears = /^(less|fewer|under|below|<)/.test(ym[1]) && !/<=/.test(ym[1]) ? Math.max(0, yc - 1) : yc; patch.yearsRule = 'hide'; } s = s.replace(ym[0], ' '); }
      else if ((ym = Q_YRS_POST.exec(s)) !== null) { var yp = numv(ym[1]); if (yp != null && yp <= 30) { patch.maxYears = yp; patch.yearsRule = 'hide'; } s = s.replace(ym[0], ' '); }
      else if ((ym = Q_YRS_HAVE.exec(s)) !== null || (ym = Q_YRS_BARE.exec(s)) !== null) { var yh = numv(ym[1]); if (yh != null && yh <= 30) { patch.maxYears = yh; patch.yearsRule = 'rank'; } s = s.replace(ym[0], ' '); }
    }
    // travel
    for (var ti = 0; ti < Q_TRAVEL.length; ti++) {
      if (rxTest(Q_TRAVEL[ti][0], s)) { if (patch.maxTravel == null) patch.maxTravel = Q_TRAVEL[ti][1]; s = s.replace(Q_TRAVEL[ti][0], ' '); }
    }
    var tm = Q_TRAVEL_PCT.exec(s);
    if (tm) { var tv = parseInt(tm[1] || tm[2] || tm[3], 10); if (tv <= 100 && patch.maxTravel == null) patch.maxTravel = tv; s = s.replace(tm[0], ' '); }
    // freshness
    var fm = Q_FRESH_N.exec(s);
    if (fm) {
      var fnum = numv(fm[1]), unit = fm[2];
      if (fnum) { var days = /^h/.test(unit) ? Math.ceil(fnum / 24) : (/^w/.test(unit) ? fnum * 7 : (/^m/.test(unit) ? fnum * 30 : fnum)); patch.postedWithin = Math.min(365, Math.max(1, days)); }
      s = s.replace(fm[0], ' ');
    }
    var fo2 = Q_FRESH_OLDER.exec(s);
    if (fo2) { ignored.push(fo2[0].trim()); ignoredWhy[fo2[0].trim()] = 'older'; s = s.replace(fo2[0], ' '); }
    if (patch.postedWithin == null) {
      for (var fi = 0; fi < Q_FRESH.length; fi++) { if (rxTest(Q_FRESH[fi][1], s)) { patch.postedWithin = Q_FRESH[fi][0]; s = s.replace(Q_FRESH[fi][1], ' '); break; } }
    }
    s = s.replace(Q_NEAR, ' near ').replace(/\s+/g, ' ');
    // exclusions: a negation covers a whole "X, Y or Z" list
    s = s.replace(Q_EXCL_LEAD, function (m, neg, prep) { return neg + (prep === 'at' ? ' at ' : ' '); });
    var negModes = [], negLevels = [], negTypes = [], cuts = [], nm;
    // an employer named after "at", in the casing you typed it
    function orgCased(w) {
      var at = lc(rawCut).indexOf(w), o = at >= 0 ? rawCut.substr(at, w.length) : '';
      return o && lc(o) === w && o !== w ? o : titleCase(w);
    }
    function atOrg(c, w) { return c.kind === 'phrase' && !Q_ORG_KIND.test(w) ? { kind: 'company', org: orgCased(w) } : c; }
    Q_NEG_RE.lastIndex = 0;
    while ((nm = Q_NEG_RE.exec(s)) !== null) {
      var start = nm.index, pos = nm.index + nm[0].length, items = [], end = pos, prevKind = null;
      Q_ITEM_PRE.lastIndex = pos; var pm0 = Q_ITEM_PRE.exec(s); if (pm0) pos += pm0[0].length;
      var atList = !!(pm0 && /^at\s+$/.test(pm0[0]));
      Q_ITEM.lastIndex = pos; var im = Q_ITEM.exec(s);
      if (im) {
        var w0 = qCleanItem(im[0]), c0 = qClassify(w0, found, opts.orgs);
        if (atList) c0 = atOrg(c0, w0);
        items.push(c0); prevKind = c0.kind; end = pos + im[0].length;
        for (var guard = 0; guard < 12; guard++) {
          Q_SEP.lastIndex = end; var sm = Q_SEP.exec(s); if (!sm) break;
          var sep = sm[1] || sm[2] ? ((sm[1] || sm[2]) === 'and' ? 'and' : 'or') : 'comma';
          if (sep === 'comma') sep = qListEnd(s, end + sm[0].length) || 'comma';
          var j = end + sm[0].length;
          Q_ITEM_PRE.lastIndex = j; var pm1 = Q_ITEM_PRE.exec(s); if (pm1) j += pm1[0].length;
          Q_ITEM.lastIndex = j; var im2 = Q_ITEM.exec(s); if (!im2) break;
          var w2 = qCleanItem(im2[0]), c2 = qClassify(w2, found, opts.orgs);
          if (atList) c2 = atOrg(c2, w2);
          if (!qContinues(prevKind, c2.kind, sep)) break;
          items.push(c2); prevKind = c2.kind; end = j + im2[0].length;
        }
      }
      items.forEach(function (c) {
        if (c.kind === 'company') addTo('blockedCompanies', [c.org]);
        else if (c.kind === 'special') {
          if (c.what === 'agencies') patch.hideAgencies = true;
          else if (c.what === 'reposts') patch.hideReposts = true;
          else if (c.what === 'ghost') patch.ghostRule = 'hide';
          else if (c.what === 'evergreen') patch.hideEvergreen = true;
          else if (c.what === 'travel') { if (patch.maxTravel == null) patch.maxTravel = 0; }
          else if (c.what === 'clearance') addTo('excludePhrases', CLEARANCE_PHRASES);
          else if (c.what === 'management') patch.avoidManagement = true;
        }
        else if (c.kind === 'mode') { if (negModes.indexOf(c.v) === -1) negModes.push(c.v); }
        else if (c.kind === 'level') { Q_LEVEL_UP[c.v].forEach(function (x) { if (negLevels.indexOf(x) === -1) negLevels.push(x); }); if (c.v === 'intern' && negTypes.indexOf('internship') === -1) negTypes.push('internship'); }
        else if (c.kind === 'type') { if (negTypes.indexOf(c.v) === -1) negTypes.push(c.v); }
        else if (c.kind === 'location') addTo('excludePlaces', [c.v]);
        else if (c.kind === 'industry') addTo('avoidIndustries', [c.v]);
        else if (c.kind === 'role') addTo('excludeRoles', c.ids);
        else if (c.kind === 'skill') addTo('excludeSkills', [c.v]);
        else if (c.kind === 'phrase') addTo('excludePhrases', [c.w]);
      });
      cuts.push([start, end]);
      Q_NEG_RE.lastIndex = Math.max(end, nm.index + nm[0].length);
    }
    for (var ci = cuts.length - 1; ci >= 0; ci--) s = s.slice(0, cuts[ci][0]) + ' ' + s.slice(cuts[ci][1]);
    s = s.replace(/\s+/g, ' ');
    // what's left is what you DO want
    if (/(?<![a-z])(visa sponsorship|sponsors?\s+visas?|sponsorships?|sponsors?|sponsoring|h-?1b|stem opt|opt|cpt)(?![a-z])/.test(s)) {
      patch.needsSponsorship = true; patch.authRule = 'hide';
      s = s.replace(/(?<![a-z])(?:that\s+|who\s+|which\s+)?(?:offers?\s+|provides?\s+|with\s+|will\s+|can\s+)?(?:visa sponsorship|sponsors?\s+visas?|sponsorships?|sponsors?|sponsoring|h-?1b|stem opt|opt|cpt)(?![a-z])/g, ' ');
    }
    var pm2, phRe = /§([0-9]+)§/g;
    while ((pm2 = phRe.exec(s)) !== null) addTo('companies', [found[parseInt(pm2[1], 10)]]);
    s = s.replace(/§[0-9]+§/g, ' ');
    var orRemote = /(?<![a-z])remote\s+or\s+(?:in\s+|near\s+|around\s+)?[a-z]/.test(s) || /[a-z.]\s+or\s+remote(?![a-z])/.test(s);
    var posModes = [];
    Q_MODE_RE.forEach(function (x) { if (rxTest(x[1], s)) { posModes.push(x[0]); s = s.replace(x[1], ' '); } });
    // places
    var locs = [], lm2, s2 = s;
    I.metroRe.lastIndex = 0;
    while ((lm2 = I.metroRe.exec(s2)) !== null) {
      var alias = lm2[1];
      if (alias.length <= 2 && !/(?<![a-z])(in|near|around|at)\s+$/.test(s2.slice(0, lm2.index))) continue;
      var mid = I.metroMap[alias]; if (locs.indexOf(I.metro[mid].name) === -1) locs.push(I.metro[mid].name);
      s = s.replace(new RegExp(B4 + '(?:in |near |around )?' + escRe(alias) + AF), ' ');
    }
    I.stateNameRe.lastIndex = 0;
    var stm;
    while ((stm = I.stateNameRe.exec(s)) !== null) { var nmS = titleCase(stm[1]); if (locs.indexOf(nmS) === -1) locs.push(nmS); }
    I.stateNameRe.lastIndex = 0;
    s = s.replace(I.stateNameRe, ' ');
    I.stateNameRe.lastIndex = 0;
    var codeRe = /(?<![a-z])(?:in|near|around|at)\s+([a-z]{2})(?![a-z])/g, cm2, s4 = s;
    while ((cm2 = codeRe.exec(s4)) !== null) {
      var code = cm2[1];
      if (!own(TAX.us_states, code.toUpperCase()) || Q_ST_BAD_POS.indexOf(code) !== -1 || own(I.metroMap, code)) continue;
      if (locs.indexOf(code.toUpperCase()) === -1) locs.push(code.toUpperCase());
      s = s.replace(cm2[0], ' ');
    }
    // "remote or Seattle": remote jobs anywhere plus jobs in Seattle - not remote-only
    if (orRemote && locs.length && posModes.indexOf('remote') !== -1) { locs.push('Remote'); if (posModes.length === 1) posModes = []; }
    if (locs.length) { patch.locations = locs.join('; '); patch.locationRule = 'hide'; }
    // roles: "senior PM", "RN", "sales jobs" (a whole family)
    var lvFromRoles = [], rm, s3 = s, foundPats = [];
    I.roleRe.lastIndex = 0;
    while ((rm = I.roleRe.exec(s3)) !== null) {
      var pat = rm[1];
      if (pat.length <= 3 && !Q_ROLE_SHORT_OK.test(pat)) continue;
      var g = Q_POS_GROUP_WORDS.indexOf(pat) !== -1 ? own(X_GROUPS, pat) : null;
      addRoles(g ? qGroupIds(g) : [I.roleMap[pat]]);
      foundPats.push(pat);
    }
    foundPats.forEach(function (p) {
      Q_LEVEL_RE.forEach(function (x) { if (rxTest(x[1], p) && lvFromRoles.indexOf(x[0]) === -1) lvFromRoles.push(x[0]); });
      s = s.replace(new RegExp(B4 + escRe(p) + 's?' + AF), ' ');
    });
    var am, aliasRe = /(?<![a-z0-9])(pms?|nps?)(?![a-z0-9])/g, s5 = s;
    while ((am = aliasRe.exec(s5)) !== null) {
      if (/[0-9]\s?$/.test(s5.slice(Math.max(0, am.index - 2), am.index))) continue;   // "5 pm"
      addRoles([Q_ROLE_ALIAS[am[1]]]); s = s.replace(new RegExp(B4 + am[1] + AF), ' ');
    }
    // levels and job types
    var posLevels = lvFromRoles.slice();
    Q_LEVEL_RE.forEach(function (x) { if (rxTest(x[1], s)) { if (posLevels.indexOf(x[0]) === -1) posLevels.push(x[0]); s = s.replace(x[1], ' '); } });
    var posTypes = [];
    Q_TYPE_RE.forEach(function (x) { if (rxTest(x[1], s)) { posTypes.push(x[0]); s = s.replace(x[1], ' '); } });
    var md = posModes.filter(function (x) { return negModes.indexOf(x) === -1; });
    if (md.length) { patch.modes = md; patch.modeRule = 'hide'; }
    if (negModes.length) patch.excludeModes = negModes;
    var lv = posLevels.filter(function (x) { return negLevels.indexOf(x) === -1; });
    if (lv.length) { patch.levels = lv; patch.levelRule = 'hide'; }
    if (negLevels.length) patch.excludeLevels = negLevels;
    var tp = posTypes.filter(function (x) { return negTypes.indexOf(x) === -1; });
    if (tp.length) { patch.types = tp; patch.typeRule = 'hide'; }
    else if (lv.indexOf('intern') !== -1 && negTypes.indexOf('internship') === -1) patch.types = ['internship'];
    if (negTypes.length) patch.excludeTypes = negTypes;
    // industries -> rank
    var inds = [], indOnly = false;
    Object.keys(Q_INDUSTRY_NAMES).sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); }).forEach(function (k) {
      if (hasWord(s, k)) {
        var id = own(Q_INDUSTRY_NAMES, k); if (inds.indexOf(id) === -1) inds.push(id);
        // "only fintech", "fintech companies only": hide the rest, don't just prefer
        if (new RegExp('(?<![a-z])(?:only|just|strictly|exclusively)\\s+(?:in\\s+|at\\s+)?(?:the\\s+)?' + escRe(k) + AF + '|' + B4 + escRe(k) + '(?:\\s+(?:companies|company|industry|sector|space|roles|jobs|firms))?\\s+only' + AF).test(s)) indOnly = true;
        s = s.replace(new RegExp(B4 + escRe(k) + AF, 'g'), ' ');
      }
    });
    if (inds.length) { patch.industries = inds; patch.industryRule = indOnly ? 'only' : 'rank'; }
    // skills -> "uses"
    var sk = uniq(findSkills(s).map(function (h) { return h.id; }));
    var csl = qCsLow();
    Object.keys(csl).sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); }).forEach(function (a) { if (hasWord(s, a) && sk.indexOf(csl[a]) === -1) sk.push(csl[a]); });
    ['Go', 'R', 'C'].forEach(function (a) {
      var re = new RegExp(B4 + a + AF), m3 = re.exec(rawCut);
      if (!m3 || !hasWord(s, lc(a))) return;
      var after = rawCut.slice(m3.index + a.length, m3.index + a.length + 12), before = lc(rawCut.slice(Math.max(0, m3.index - 12), m3.index));
      if (/^-/.test(after) || (a === 'C' && /(series|class|grade|vitamin|type|tier|plan|level|section)\s+$/.test(before)) || (a === 'Go' && /^\s+(to|live|beyond|above|after|back|out|through|get)(?![a-z])/i.test(after))) return;
      var id = own(I.csMap, a); if (id && sk.indexOf(id) === -1) sk.push(id);
    });
    sk = sk.filter(function (id) { return I.skill[id] && I.skill[id].kind !== 'soft'; });
    if (sk.length) {
      patch.mustSkills = sk; patch.mustSkillsMode = 'any';
      sk.forEach(function (id) { (I.skill[id].aliases || []).concat(I.skill[id].cs || []).forEach(function (a) { s = s.replace(new RegExp(B4 + escRe(lc(a)) + AF, 'g'), ' '); }); });
    }
    // a whole family: "sales jobs", "design roles", "analyst roles"
    Q_POS_GROUP_WORDS.slice().sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); }).forEach(function (k) {
      if (hasWord(s, k)) { addRoles(qGroupIds(own(X_GROUPS, k))); s = s.replace(new RegExp(B4 + escRe(k) + AF, 'g'), ' '); }
    });
    Q_TITLE_NOUNS.forEach(function (n) {
      var re = new RegExp(B4 + n + 's?' + AF, 'g');
      if (rxTest(re, s)) { addRoles(qNounIds(n)); s = s.replace(re, ' '); }
    });
    // leftovers rank, never hide: runs of 1-2 words stay a phrase, longer runs split into words
    var runs = [], cur = [], tk, tokRe = /[a-z0-9][a-z0-9&.+#'\/-]*|[,;:.()\[\]{}]/g;
    while ((tk = tokRe.exec(s)) !== null) {
      var w = tk[0].replace(/^['\-\/&.]+|['\-\/&.]+$/g, '');
      if (!w || /^[,;:.()\[\]{}]$/.test(tk[0]) || qStop(w) || /^[0-9.]+$/.test(w) || w.length < 3) { if (cur.length) { runs.push(cur); cur = []; } continue; }
      cur.push(w);
    }
    if (cur.length) runs.push(cur);
    runs.forEach(function (r) { (r.length <= 2 ? [r.join(' ')] : r).forEach(function (x) { if (rank.indexOf(x) === -1) rank.push(x); }); });
    if (hard.length) patch.keywords = hard;
    if (rank.length) patch.rankKeywords = rank.slice(0, 6);
    rank.slice(6).forEach(function (x) { ignored.push(x); ignoredWhy[x] = 'overflow'; });   // said, not silently dropped
    return { raw: raw, chips: chipsFromPatch(patch, roles), patch: patch, roles: roles, keywords: hard.slice(), rankKeywords: (patch.rankKeywords || []).slice(), ignored: ignored, ignoredWhy: ignoredWhy };
  }
  function qCleanItem(w) {
    w = w.replace(/[.']+$/, '').trim();
    for (var k = 0; k < 3; k++) { var w2 = w.replace(Q_ITEM_POST, ''); if (w2 === w || !w2) break; w = w2; }
    return w;
  }
  // "no sales, marketing or design" is one list: look ahead for the word that closes it
  function qListEnd(s, pos) {
    for (var k = 0; k < 8; k++) {
      Q_ITEM_PRE.lastIndex = pos; var pm = Q_ITEM_PRE.exec(s); if (pm) pos += pm[0].length;
      Q_ITEM.lastIndex = pos; var im = Q_ITEM.exec(s); if (!im) return null;
      pos += im[0].length;
      Q_SEP.lastIndex = pos; var sm = Q_SEP.exec(s); if (!sm) return null;
      if (sm[1] || sm[2]) return (sm[1] || sm[2]) === 'and' ? 'and' : 'or';
      pos += sm[0].length;
    }
    return null;
  }
  var LEVEL_CHIP = { intern: 'Internship', entry: 'Entry level', mid: 'Mid level', senior: 'Senior', lead: 'Lead / Staff', director: 'Director', exec: 'Executive' };
  function qMoney(v, hr) { return hr ? '$' + (rhu(v / 2080 * 100) / 100) + '/hr' : '$' + fmtK(v); }
  function qGroupChips(ids, neg) {
    // a whole family collapses into one chip ("Sales roles", "No analyst roles")
    var I = idx(), out = [], used = dict(), gm = dict();
    TAX.roles.forEach(function (r) { (gm[r.group] = gm[r.group] || []).push(r.id); });
    function free(list) { return list.length > 1 && list.every(function (x) { return ids.indexOf(x) !== -1 && !used[x]; }); }
    ids.forEach(function (id) {
      if (used[id] || !I.role[id]) return;
      for (var i = 0; i < Q_TITLE_NOUNS.length; i++) {
        var fam = qNounIds(Q_TITLE_NOUNS[i]);
        if (fam.indexOf(id) !== -1 && free(fam)) {
          fam.forEach(function (x) { used[x] = 1; });
          out.push({ value: fam, label: neg ? 'No ' + Q_TITLE_NOUNS[i] + ' roles' : capFirst(Q_TITLE_NOUNS[i]) + ' roles' });
          return;
        }
      }
      var g = I.role[id].group, all = gm[g];
      if (free(all)) {
        all.forEach(function (x) { used[x] = 1; });
        var gl = own(GROUP_LABEL, g) || g;
        out.push({ value: all.slice(), label: neg ? 'No ' + gl + ' roles' : capFirst(gl) + ' roles' });
      } else { used[id] = 1; out.push({ value: [id], label: neg ? 'No ' + I.role[id].name + ' roles' : I.role[id].name }); }
    });
    return out;
  }
  function qLevelRanges(lv) {
    var out = [], cur = [];
    LEVEL_ORDER.forEach(function (x) { if (lv.indexOf(x) !== -1) cur.push(x); else if (cur.length) { out.push(cur); cur = []; } });
    if (cur.length) out.push(cur);
    return out;
  }
  function qLevelRangeLabel(rg) {
    if (rg.length === 1) return rg[0] === 'intern' ? 'No internships' : 'No ' + LEVEL_CHIP[rg[0]].toLowerCase() + ' roles';
    if (rg[rg.length - 1] === 'exec') return 'No ' + LEVEL_CHIP[rg[0]].toLowerCase() + ' or above';
    if (rg[0] === 'intern') return 'No ' + LEVEL_CHIP[rg[rg.length - 1]].toLowerCase() + ' or below';
    return 'No ' + rg.map(function (x) { return LEVEL_CHIP[x].toLowerCase(); }).join(', ');
  }
  // One chip per thing the patch applies, in a fixed order; each knows how to undo itself (dropChip).
  function chipsFromPatch(patch, roles) {
    var I = idx(), p = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}, out = [];
    function arr(k) { return Array.isArray(p[k]) ? p[k].filter(function (x) { return typeof x === 'string'; }) : []; }
    function add(kind, key, value, label, also) { var c = { kind: kind, key: key, value: value, label: label }; if (also) c.alsoTypes = also; out.push(c); }
    function soft(rk) { return p[rk] === 'rank' ? ' (preferred)' : ''; }   // it ranks, it doesn't hide
    qGroupChips(Array.isArray(roles) ? roles.filter(function (x) { return typeof x === 'string'; }) : [], false).forEach(function (c) { add('role', 'role', c.value, c.label); });
    arr('companies').forEach(function (o) { add('company', 'companies', [o], 'At ' + o); });
    var locStr = p.locations != null ? str(p.locations).trim() : '';
    if (locStr) add('location', 'locations', locStr, locStr.split(/\s*;\s*/).filter(function (x) { return !!x; }).join(' or ') + soft('locationRule'));
    if (p.relocate === false && p.locationRule === 'hide' && !locStr) add('location', 'relocate', false, 'Near you only (no relocation)');
    else if (p.relocate === true) add('location', 'relocate', true, 'Open to relocating');
    if (arr('modes').length) add('mode', 'modes', arr('modes').slice(), arr('modes').map(modeName).join(' or ') + soft('modeRule'));
    var lvp = arr('levels'), tps = arr('types'), alsoT = lvp.indexOf('intern') !== -1 && tps.length === 1 && tps[0] === 'internship';
    if (lvp.length) add('level', 'levels', lvp.slice(), lvp.map(function (x) { return own(LEVEL_CHIP, x) || x; }).join(' or ') + soft('levelRule'), alsoT ? ['internship'] : null);
    if (tps.length && !alsoT) add('type', 'types', tps.slice(), tps.map(function (t) { return own(TYPE_NAMES, t) || t; }).join(' or ') + soft('typeRule'));
    var F = isNum(p.salaryFloor) ? p.salaryFloor : null, T = isNum(p.salaryTarget) ? p.salaryTarget : null, C = isNum(p.salaryCeiling) ? p.salaryCeiling : null, sl = null;
    var hu = p.salaryUnit === 'hour';
    if (F != null && C != null) sl = qMoney(F, hu) + '–' + qMoney(C, hu);
    else if (F != null && T != null && T > F) sl = qMoney(F, hu) + '–' + qMoney(T, hu);
    else if (F != null) sl = qMoney(F, hu) + '+';
    else if (C != null) sl = 'Up to ' + qMoney(C, hu);
    if (sl) add('salary', 'salary', F != null ? F : C, sl + soft('salaryRule'));
    if (isNum(p.maxYears)) add('years', 'maxYears', p.maxYears, (p.maxYears === 0 ? 'No experience needed' : 'Asks ≤ ' + p.maxYears + (p.maxYears === 1 ? ' year' : ' years')) + soft('yearsRule'));
    if (isNum(p.postedWithin) && p.postedWithin > 0) add('fresh', 'postedWithin', p.postedWithin, 'Posted ≤ ' + p.postedWithin + (p.postedWithin === 1 ? ' day' : ' days'));
    if (isNum(p.maxTravel)) add('travel', 'maxTravel', p.maxTravel, p.maxTravel === 0 ? 'No travel' : 'Travel ≤ ' + p.maxTravel + '%');
    arr('industries').forEach(function (d) { if (I.ind[d]) add('industry', 'industries', [d], I.ind[d].name + (p.industryRule === 'only' ? '' : ' (preferred)')); });
    var ms = arr('mustSkills').filter(function (id) { return !!I.skill[id]; });
    if (ms.length) add('skills', 'mustSkills', ms.slice(), 'Uses ' + ms.map(function (id) { return I.skill[id].name; }).join(p.mustSkillsMode === 'all' ? ' and ' : ' or '));
    if (p.needsSponsorship === true) add('auth', 'needsSponsorship', true, p.authRule === 'rank' ? 'Ranks “no sponsorship” posts lower' : 'Hides “no sponsorship” posts');
    arr('blockedCompanies').forEach(function (o) { add('exclude', 'blockedCompanies', [o], 'Not at ' + o); });
    qGroupChips(arr('excludeRoles'), true).forEach(function (c) { add('exclude', 'excludeRoles', c.value, c.label); });
    arr('avoidIndustries').forEach(function (d) { if (I.ind[d]) add('exclude', 'avoidIndustries', [d], 'Not in ' + I.ind[d].name); });
    arr('excludeSkills').forEach(function (id) { if (I.skill[id]) add('exclude', 'excludeSkills', [id], 'Doesn’t require ' + I.skill[id].name); });
    arr('excludePlaces').forEach(function (x) { add('exclude', 'excludePlaces', [x], 'Not in ' + x); });
    arr('excludeModes').forEach(function (m) { add('exclude', 'excludeModes', [m], 'No ' + modeWord(m)); });
    var xt = arr('excludeTypes'), xInternChip = false;
    qLevelRanges(arr('excludeLevels')).forEach(function (rg) {
      var also = rg.indexOf('intern') !== -1 && xt.indexOf('internship') !== -1;
      if (also) xInternChip = true;
      add('exclude', 'excludeLevels', rg, qLevelRangeLabel(rg), also ? ['internship'] : null);
    });
    xt.forEach(function (t) { if (t === 'internship' && xInternChip) return; add('exclude', 'excludeTypes', [t], 'No ' + (own(TYPE_NAMES, t) || t).toLowerCase() + ' roles'); });
    if (p.hideAgencies === true) add('exclude', 'hideAgencies', true, 'No agencies');
    if (p.hideReposts === true) add('exclude', 'hideReposts', true, 'No reposts');
    if (p.ghostRule === 'hide') add('exclude', 'ghostRule', 'hide', 'No ghost-risk posts');
    if (p.hideEvergreen === true) add('exclude', 'hideEvergreen', true, 'No talent-pool posts');
    if (p.avoidManagement === true) add('exclude', 'avoidManagement', true, 'No people management');
    var ph = arr('excludePhrases');
    if (CLEARANCE_PHRASES.every(function (x) { return ph.indexOf(x) !== -1; })) { add('exclude', 'excludePhrases', CLEARANCE_PHRASES.slice(), 'No clearance roles'); ph = ph.filter(function (x) { return CLEARANCE_PHRASES.indexOf(x) === -1; }); }
    ph.forEach(function (x) { add('exclude', 'excludePhrases', [x], 'Not "' + x + '"'); });
    arr('keywords').forEach(function (k) { add('keyword', 'keywords', [k], '"' + k + '"'); });
    arr('rankKeywords').forEach(function (k) { add('boost', 'rankKeywords', [k], '"' + k + '"'); });
    return out;
  }
  // Undo one chip: returns the patch and roles without what that chip applied.
  function dropChip(patch, roles, chip) {
    var p = JSON.parse(JSON.stringify(patch && typeof patch === 'object' ? patch : {})), r = Array.isArray(roles) ? roles.slice() : [];
    if (!chip || !chip.key) return { patch: p, roles: r };
    var vals = Array.isArray(chip.value) ? chip.value : [chip.value];
    function del() { for (var k = 0; k < arguments.length; k++) delete p[arguments[k]]; }
    function rm(k, list) { if (Array.isArray(p[k])) { p[k] = p[k].filter(function (x) { return list.indexOf(x) === -1; }); if (!p[k].length) delete p[k]; } }
    switch (chip.key) {
      case 'role': r = r.filter(function (x) { return vals.indexOf(x) === -1; }); break;
      case 'modes': del('modes', 'modeRule'); break;
      case 'locations': del('locations'); if (p.relocate !== false) del('locationRule'); break;
      case 'relocate': del('relocate'); if (!p.locations) del('locationRule'); break;
      case 'salary': del('salaryFloor', 'salaryTarget', 'salaryCeiling', 'salaryRule', 'salaryUnit'); break;
      case 'levels': del('levels', 'levelRule'); if (chip.alsoTypes) del('types', 'typeRule'); break;
      case 'types': del('types', 'typeRule'); break;
      case 'maxYears': del('maxYears', 'yearsRule'); break;
      case 'industries': rm('industries', vals); if (!p.industries) del('industryRule'); break;
      case 'mustSkills': del('mustSkills', 'mustSkillsMode'); break;
      case 'needsSponsorship': del('needsSponsorship', 'authRule'); break;
      case 'excludeLevels': rm('excludeLevels', vals); if (chip.alsoTypes) rm('excludeTypes', chip.alsoTypes); break;
      case 'postedWithin': case 'maxTravel': case 'hideAgencies': case 'hideReposts': case 'ghostRule': case 'hideEvergreen': case 'avoidManagement': del(chip.key); break;
      default: rm(chip.key, vals);
    }
    return { patch: p, roles: r };
  }

  /* ------------------------------------------------------------- insights */
  function pctl(sorted, q) { if (!sorted.length) return null; return sorted[Math.floor((sorted.length - 1) * q)]; }
  function marketPulse(items, cand) {
    var I = idx();
    var n = items.length, skillCount = dict(), skillReq = dict(), sal = [], modes = { remote: 0, hybrid: 0, onsite: 0, unknown: 0 }, levels = dict(), orgs = dict(), newWeek = 0, noSpon = 0, spons = 0, orgName = dict();
    items.forEach(function (it) {
      var j = it.job;
      uniq(j.skills.map(function (s) { return s.id; })).forEach(function (id) { skillCount[id] = (skillCount[id] || 0) + 1; });
      j.skills.forEach(function (s) { if (s.required) skillReq[s.id] = (skillReq[s.id] || 0) + 1; });
      if (j.salary.source === 'listed' || j.salary.source === 'parsed') { var mid = j.salary.annualMin != null && j.salary.annualMax != null ? (j.salary.annualMin + j.salary.annualMax) / 2 : (j.salary.annualMax || j.salary.annualMin); if (mid) sal.push(rhu(mid)); }
      modes[j.mode || 'unknown'] = (modes[j.mode || 'unknown'] || 0) + 1;
      var b = levelBucket(j.level) || 'unknown'; levels[b] = (levels[b] || 0) + 1;
      var o = normOrg(j.org); if (o) { orgs[o] = (orgs[o] || 0) + 1; orgName[o] = orgName[o] || j.org; }
      if (it.opp.ageDays != null && it.opp.ageDays <= 7) newWeek++;
      if (j.auth.noSponsorship) noSpon++; if (j.auth.sponsors) spons++;
    });
    var topSkills = Object.keys(skillCount).filter(function (id) { return I.skill[id].kind !== 'soft'; }).sort(function (a, b) { return skillCount[b] - skillCount[a] || I.skill[a]._i - I.skill[b]._i; }).slice(0, 12).map(function (id) {
      var c = cand ? cand.skills[id] : null, have = c ? c.level : 'missing';
      if (!c && cand) { var cr = skillCredit({ id: id, family: I.skill[id].family }, cand); if (cr.how === 'adjacent' || cr.how === 'related') have = cr.how; }
      return { id: id, name: I.skill[id].name, count: skillCount[id], required: skillReq[id] || 0, pct: n ? rhu(100 * skillCount[id] / n) : 0, have: have };
    });
    sal.sort(function (a, b) { return a - b; });
    var companies = Object.keys(orgs).sort(function (a, b) { return orgs[b] - orgs[a] || (a < b ? -1 : 1); }).slice(0, 8).map(function (o) { return { org: orgName[o], count: orgs[o] }; });
    return { n: n, topSkills: topSkills, salary: { n: sal.length, p25: pctl(sal, 0.25), median: pctl(sal, 0.5), p75: pctl(sal, 0.75), min: sal.length ? sal[0] : null, max: sal.length ? sal[sal.length - 1] : null }, modes: modes, levels: levels, companies: companies, newThisWeek: newWeek, noSponsorship: noSpon, sponsors: spons };
  }
  function scoreAudit(items) {
    var bands = { excellent: 0, strong: 0, partial: 0, weak: 0, poor: 0, unknown: 0 }, hist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], fits = [], caps = {}, conf = { high: 0, medium: 0, low: 0 };
    items.forEach(function (it) {
      var s = it.score; bands[s.band] = (bands[s.band] || 0) + 1; conf[s.confidence]++;
      if (s.fit != null) { fits.push(s.fit); hist[Math.min(9, Math.floor(s.fit / 10))]++; }
      if (s.capApplied) caps[s.capApplied.key] = (caps[s.capApplied.key] || 0) + 1;
    });
    fits.sort(function (a, b) { return a - b; });
    var avg = fits.length ? rhu(fits.reduce(function (a, b) { return a + b; }, 0) / fits.length) : null;
    return { n: items.length, bands: bands, histogram: hist, avg: avg, median: pctl(fits, 0.5), capsApplied: caps, confidence: conf, over90: fits.filter(function (f) { return f >= 90; }).length };
  }

  /* ------------------------------------------------- compatibility output */
  // The rest of the app (overview, mission, auto, roadmap) reads saved matches
  // in the legacy shape: pct / tags / loc / matchedSkill... Keep feeding it.
  function toLegacyMatch(it) {
    var j = it.job, s = it.score, o = it.opp;
    return {
      id: /^-?[0-9]{1,15}$/.test(j.id) ? Number(j.id) : j.id, type: j.type, title: j.title, org: j.org, loc: j.location || (j.mode === 'remote' ? 'Remote' : ''),
      deadline: j.deadline || '', description: j.description, tags: j.skills.map(function (x) { return x.name.toLowerCase(); }).slice(0, 8),
      pct: s.fit == null ? 0 : s.fit, band: s.bandLabel, confidence: s.confidence,
      matchedSkill: s.skillDetail.filter(function (d) { return d.credit >= 0.85; }).map(function (d) { return d.name.toLowerCase(); }),
      matchedGoal: s.roleMatch ? [idx().role[s.roleMatch.job].name.toLowerCase()] : [],
      missingSkills: s.skillDetail.filter(function (d) { return d.required && d.credit === 0; }).map(function (d) { return d.name; }),
      signalStrength: s.confidence === 'high' ? 'high' : (s.confidence === 'medium' ? 'moderate' : 'low'),
      signalScore: rhu(it.rank), signalBand: s.bandLabel, ghostRisk: o.ghost, freshness: o.freshness, ageDays: o.ageDays,
      salaryMin: j.salary.annualMin != null ? rhu(j.salary.annualMin / 1000) : null, salaryMax: j.salary.annualMax != null ? rhu(j.salary.annualMax / 1000) : null,
      salaryIsPredicted: j.salary.source === 'estimated', mode: j.mode, employmentType: j.employmentType, applyUrl: j.applyUrl,
      factors: { skills: s.dims.skills, level: s.dims.level, role: s.dims.role, industry: s.dims.industry, preferences: s.pref.score },
      engine: 'proof-v2',
    };
  }

  var api = {
    version: ENGINE_VERSION,
    get TAX() { return TAX; },
    setTaxonomy: function (t) { TAX = t; IDX = null; Q_CS_LOW = null; },
    normText: normText, segments: segments, findSkills: findSkills, normalizeListing: normalizeListing,
    parseJob: parseJob, parseYears: function (d) { return parseYears(segments(d)); }, titleLevel: titleLevel, levelLabel: levelLabel, levelBucket: levelBucket,
    parsePlaces: parsePlaces, parseUserLocation: parseUserLocation, findRoles: findRoles, roleSim: roleSim,
    buildCandidate: buildCandidate, scoreJob: scoreJob, assessOpportunity: assessOpportunity, evaluateFilters: evaluateFilters,
    defaultPrefs: defaultPrefs, mergePrefs: mergePrefs, composePrefs: composePrefs, analyzePool: analyzePool, dedupePool: dedupePool, sortItems: sortItems,
    parseQuery: parseQuery, chipsFromPatch: chipsFromPatch, dropChip: dropChip, phraseIn: phraseIn, learnFromDismiss: learnFromDismiss, learnFromSave: learnFromSave, mergeLearned: mergeLearned, learnedEffect: learnedEffect,
    marketPulse: marketPulse, scoreAudit: scoreAudit, canonicalKey: canonicalKey, normOrg: normOrg, normTitle: normTitle,
    scoreLevers: scoreLevers, skillUnlocks: skillUnlocks,
    toLegacyMatch: toLegacyMatch, bandOf: bandOf, fmtK: fmtK, TYPE_NAMES: TYPE_NAMES, LEVEL_CHIP: LEVEL_CHIP, DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    skillName: function (id) { var s = idx().skill[id]; return s ? s.name : id; },
    roleName: function (id) { var r = idx().role[id]; return r ? r.name : id; },
    industryName: function (id) { var d = idx().ind[id]; return d ? d.name : id; },
    metroName: function (id) { var m = idx().metro[id]; return m ? m.name : id; },
    allRoles: function () { return TAX.roles.map(function (r) { return { id: r.id, name: r.name, group: r.group }; }); },
    allIndustries: function () { return TAX.industries.map(function (d) { return { id: d.id, name: d.name }; }); },
    allSkills: function () { return TAX.skills.filter(function (s) { return s.kind !== 'soft'; }).map(function (s) { return { id: s.id, name: s.name, kind: s.kind }; }); },
  };
  root.JobEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
