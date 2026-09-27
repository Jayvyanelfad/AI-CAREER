// Course C curriculum. These definitions update content for existing records;
// database IDs, module ordering, and lesson ordering remain unchanged.
const courses = {
  advanced_ml: {
    objective: 'By the end, you will design a reproducible ML experiment, choose a model and features for a defined task, evaluate it on suitable data, interpret errors, and propose a safe production plan. Prior ML and basic Python are recommended; plan for about 12 hours. Your outcome is an evaluated, documented model proposal with limitations and next experiments.',
    modules: {
      'Deep Learning Foundations': 'Select and train neural approaches against a defined baseline, controlling leakage and overfitting with suitable validation and experiments.',
      'Natural Language Processing (NLP)': 'Prepare text, compare classical and neural representations, and choose sequence models for the task and available evidence.',
      'Computer Vision and Applications': 'Build a vision workflow from image preparation through task-specific evaluation, with attention to safety and data limitations.',
      'ML Ops and Deployment': 'Plan reproducible serving, monitoring, experimentation, and responsible model maintenance rather than treating deployment as a one-time handoff.'
    },
    lessons: {
      'Artificial Neural Networks Review': [
        'Choose a neural baseline and describe the inputs, target, loss, and comparison needed for a defensible experiment.',
        'A city estimates next-day electricity demand. The data team has many weather, calendar, and meter variables, but no clear benchmark.',
        'What simple approach should a neural model beat, and which information would not exist at prediction time?',
        'A neural network learns adjustable weights that transform features into predictions. Feature choices encode domain assumptions; a loss measures training error. Compare model capacity, latency, and a simple baseline using a split that matches future use.',
        'For next-day demand, compare a neural model with yesterday’s demand and a seasonal baseline. Encode calendar effects only from information known at forecast time; exclude tomorrow’s actual temperature.',
        'Write the prediction time, target, two available features, one likely leakage feature, and a baseline you would report beside a neural result.',
        'A sophisticated architecture is useful only when its evaluation answers a real decision better than a credible baseline.'
      ],
      'Convolutional Neural Networks (CNNs)': [
        'Explain how local filters and shared weights make convolutional networks useful for image patterns.',
        'A recycling center wants to sort photographs of bottles, cans, and paper, even when an item appears at different image locations.',
        'Why might a model that learns local shape patterns reuse the same detector across an image?',
        'A convolution applies learned filters across nearby pixels, sharing weights across positions. Pooling or strided layers reduce spatial size. These choices encode useful assumptions but do not guarantee robustness to lighting or viewpoint.',
        'A small CNN can detect edges and textures before combining them into class evidence. Keep an untouched test set from a later collection day to check changing camera conditions.',
        'Sketch what a small receptive field can notice and name two image changes that might still confuse the classifier.',
        'CNN structure matches spatial data, while performance still depends on representative images and honest testing.'
      ],
      'Recurrent Neural Networks (RNNs)': [
        'Identify when sequence order matters and explain the hidden state used by a recurrent model.',
        'A factory predicts whether a machine needs inspection from the last hour of vibration readings.',
        'Would an unordered average preserve a short spike that occurred just before a fault?',
        'An RNN processes a sequence one step at a time and carries a state forward. LSTM and GRU gates help preserve useful signals across longer sequences, but training can be slower and long-range context remains difficult.',
        'Keep readings in timestamp order, define the forecast horizon, and split by machine or time so adjacent windows do not leak across evaluation sets.',
        'Choose one sequence length and prediction horizon for the factory task. What failure would result from randomly splitting overlapping windows?',
        'Sequence models depend on ordering and evaluation that respects time and entity boundaries.'
      ],
      'Training Deep Networks': [
        'Diagnose underfitting, overfitting, and unstable training with learning curves and controlled changes.',
        'A team reports near-perfect training accuracy, while performance falls sharply on a later month of customer records.',
        'Does the model generalize, or has it memorized quirks in the training examples?',
        'Overfitting occurs when a model captures training-specific detail that does not transfer. Weight decay, dropout, early stopping, and smaller models can help. Tune learning rate or regularization on validation data, not on the final test set.',
        'If training loss keeps falling while validation loss rises, stop at the best validation checkpoint. Run a small, recorded hyperparameter search that changes one planned setting at a time.',
        'Given improving training and worsening validation curves, propose one intervention and one diagnostic check. State the tuning range, selection metric, and why the test set must remain untouched.',
        'Use validation behavior to guide controlled experiments; never tune repeatedly against the final test set.'
      ],
      'Transfer Learning and Fine-tuning': [
        'Decide whether a pretrained model is a good starting point and plan a careful fine-tuning comparison.',
        'A small conservation group has only a few hundred labeled camera-trap images of local wildlife.',
        'What useful visual patterns might a model have learned from a larger image collection, and what might not transfer?',
        'Transfer learning reuses parameters learned on another dataset. Freeze earlier layers or fine-tune selected layers, compare with a simple baseline, and guard against duplicate images across splits.',
        'Resize images consistently, keep one site or time period for evaluation, and compare a frozen-feature classifier with a lightly fine-tuned model.',
        'List two reasons a pretrained model may fail on night-vision images. What small experiment would test whether fine-tuning helps?',
        'Pretraining can reduce data needs, but domain mismatch and split leakage can create false confidence.'
      ],
      'Text Preprocessing and Representation': [
        'Choose a text representation that preserves distinctions needed by the task and avoids fitting preprocessing on test data.',
        'A support team classifies short messages, but product names and misspellings carry useful signals.',
        'Would stemming every word improve the result, or could it erase a distinction the classifier needs?',
        'Tokenization turns text into units; TF-IDF weights terms by document frequency; embeddings represent tokens as learned vectors. Fit vocabulary and transformations on training data only.',
        'Build a TF-IDF pipeline inside cross-validation so vocabulary is learned per training fold. Compare lowercasing and token choices with a held-out set.',
        'Name one tokenization decision for product codes and one leakage risk if the full corpus is used to fit vocabulary before splitting.',
        'Text preparation is part of the model and must be evaluated without peeking at held-out examples.'
      ],
      'Classical NLP Techniques': [
        'Select a text task and baseline technique, then inspect errors before escalating model complexity.',
        'A service desk routes short requests to billing, account access, or technical support.',
        'Could a transparent bag-of-words model solve enough of the task before adding a large language model?',
        'Sparse term features with logistic regression or a linear SVM often provide fast, inspectable baselines. For imbalanced labels, compare class weights or carefully sampled training data and evaluate with per-class precision, recall, and a precision-recall curve.',
        'Train a TF-IDF plus linear classifier inside cross-validation, keep resampling within each training fold, then inspect de-identified false routes for missing vocabulary or ambiguous labels.',
        'For rare account-access requests, which metric reveals missed cases better than overall accuracy? Compare class weighting with a human fallback and state the workload trade-off.',
        'A modest model with clear errors can be a better engineering choice than an opaque, unnecessary one.'
      ],
      'Word Embeddings and Language Models': [
        'Explain what an embedding encodes and why similarity in vector space is not the same as truth or fairness.',
        'A catalog search wants related terms such as “jacket” and “coat” to retrieve nearby products.',
        'What does a nearby vector suggest, and what does it not prove about a result?',
        'An embedding maps tokens or text into numeric vectors learned from context or another objective. Similarity reflects training data and objective; it can preserve stereotypes and miss domain-specific meanings.',
        'Compare nearest neighbors for a domain term before and after adapting representations. Review examples across groups and treat similarity as a retrieval clue, not a factual judgment.',
        'Choose a small set of terms for a nearest-neighbor audit. What biased association, ambiguity, or out-of-domain behavior will you look for?',
        'Representations inherit assumptions from data and need task-specific review.'
      ],
      'Sequence Models with RNNs and Transformers': [
        'Compare recurrent context with attention-based context when selecting a sequence model.',
        'A legal aid service summarizes long forms, where an important date near the beginning may relate to a decision near the end.',
        'How might direct attention between distant tokens help, and what resource cost does it introduce?',
        'RNNs carry state sequentially; transformers use attention to relate tokens more directly and parallelize training. Attention cost and context limits grow with sequence length, and neither model guarantees faithful reasoning.',
        'For short sensor streams, a compact recurrent model may fit latency constraints; for long text, a transformer may capture context but require truncation or chunking.',
        'Choose a model family for short device readings and for long documents. State a quality, latency, or context-length test for each choice.',
        'Model selection balances task behavior, compute, context, and operational constraints.'
      ],
      'Transformer Architecture and BERT': [
        'Describe encoder-style contextual representations and choose a fine-tuning task with an appropriate split.',
        'A research team labels short abstracts by topic and wants a model that uses the surrounding words to resolve ambiguous terms.',
        'Why might the same word carry different meaning in different sentences?',
        'A transformer encoder builds contextual token representations using self-attention. BERT-style models are pretrained with language objectives and can be fine-tuned for classification or token labeling.',
        'Fine-tune a small classifier on labeled abstracts, keep documents from the same source together across splits, and compare with a TF-IDF baseline.',
        'Describe one reason a random sentence split could overstate performance if abstracts from one report appear in both train and test sets.',
        'Contextual models are powerful, but data boundaries and baselines still determine whether results are credible.'
      ],
      'Image Processing Fundamentals': [
        'Inspect image size, color, orientation, and transformation choices before training a vision model.',
        'A quality team combines photographs from two phone models; one saves rotated images and the other uses a different color profile.',
        'Could preprocessing differences be mistaken for the target label?',
        'Images are arrays of pixel values. Resizing, normalization, color conversion, and augmentation change the input distribution; fit choices using training data and preserve labels through transformations.',
        'Check a grid of representative images and metadata before resizing. Apply only label-preserving augmentation such as a modest crop when object orientation is irrelevant.',
        'List an image check for dimensions, orientation, and label validity. Name an augmentation that would invalidate a “left-facing” label.',
        'Visualize transformed samples; never assume a preprocessing step preserves the task.'
      ],
      'Object Detection and Recognition': [
        'Distinguish image classification from object detection and evaluate localization as well as class correctness.',
        'A warehouse wants to count damaged packages in a scene containing several items.',
        'Is one label for the whole image enough to identify each package and its location?',
        'Classification assigns labels to an image; detection predicts boxes and classes for multiple objects. Precision-recall tradeoffs and intersection-over-union thresholds affect detection scores.',
        'Annotate a small, consented set with boxes, define how overlapping items are labeled, and review misses by object size and lighting.',
        'Choose a metric and review slice for tiny packages at the edge of a frame. What operational action should occur when confidence is low?',
        'Evaluate whether the system finds the objects people need, not only whether its class label is plausible.'
      ],
      'Image Segmentation': [
        'Choose semantic or instance segmentation based on whether separate object identities matter.',
        'A landscaping team estimates plant-covered area in plots where several plants overlap.',
        'Does the task need a mask for each individual plant, or only a plant-versus-background map?',
        'Semantic segmentation labels each pixel by class; instance segmentation separates individual objects. Annotation boundaries, class imbalance, and evaluation overlap metrics affect interpretation.',
        'For total vegetation area, semantic masks may be sufficient; for counting overlapping plants, instance masks may be needed. Compare predictions with carefully reviewed annotations.',
        'Choose a segmentation type for area estimation and for counting separate objects. What annotation burden does each choice create?',
        'Let the decision determine the label structure and evaluation, rather than choosing the most complex model.'
      ],
      'Video Analysis and Motion Tracking': [
        'Explain why video evaluation must preserve temporal order and distinguish object tracking from single-frame detection.',
        'A transit team estimates passenger flow from station video, but repeated frames from one event are highly similar.',
        'What would happen if neighboring frames were split randomly between training and testing?',
        'Tracking links detections across frames; temporal models use order and motion. Split evaluation by recording session or location, protect privacy, and avoid retaining identifiable footage unnecessarily.',
        'Evaluate on later sessions from a different camera angle, report tracking continuity and missed counts, and aggregate or blur data according to the approved purpose.',
        'Propose a split that prevents near-duplicate frames crossing partitions. State one privacy safeguard and one failure measure.',
        'Video adds temporal leakage and privacy risks; handle both as core design constraints.'
      ],
      'Applications: Autonomous Vehicles and Medical Imaging': [
        'Assess high-impact vision applications through error consequences, oversight, and limits on intended use.',
        'A hospital evaluates an imaging model that flags possible findings for clinician review.',
        'Which error is more harmful in this workflow, and who remains responsible for a decision?',
        'High-impact models need representative evaluation, calibrated communication, subgroup analysis, human oversight, and a clear operational boundary. Test performance does not establish clinical safety or driving readiness.',
        'Report sensitivity and false-negative patterns across relevant equipment and populations, route uncertain cases to qualified review, and monitor changes in acquisition conditions.',
        'Write a deployment boundary for a fictional imaging aid. Name the responsible professional, a failure mode, and evidence required before expanding use.',
        'A model score supports a bounded workflow; it does not transfer accountability from people.'
      ],
      'Model Serving and APIs': [
        'Choose online or batch inference and define a versioned prediction contract with safe input and failure behavior.',
        'A retailer needs product recommendations on page load, while nightly inventory risk forecasts can wait until morning.',
        'Do both requests need a synchronous API with the same latency and availability target?',
        'Online serving returns a prediction during a request; batch inference processes many records on a schedule. Version features and model artifacts, validate inputs, and define fallback behavior.',
        'Serve recommendations with a strict timeout and a cached or popularity fallback; run overnight forecasts as a traceable batch with row counts and error summaries.',
        'Choose serving style for a checkout fraud signal and a monthly demand report. State a latency target, failure response, and artifact version to record.',
        'Production design begins with the user-facing contract, not the choice of serving framework.'
      ],
      'Monitoring and Maintaining ML Models': [
        'Separate service health, data drift, and model quality monitoring and define a response owner.',
        'A model’s API remains fast, but fewer customers accept its recommendations after a pricing policy changes.',
        'Would uptime alone reveal that the model no longer helps?',
        'Monitor latency and errors, input distributions, prediction patterns, and delayed ground-truth outcomes. Drift is a signal to investigate, not proof that retraining is needed.',
        'Track a privacy-conscious feature summary and later acceptance by relevant segment. Set a review threshold, owner, and rollback option before release.',
        'For a delayed-label task, name one immediate signal and one later quality measure. What action follows an alert, and who decides?',
        'Monitoring is useful when signals have context, ownership, and a safe response.'
      ],
      'A/B Testing and Experimentation': [
        'Plan a controlled experiment with a primary metric, guardrails, randomization unit, and stopping rule.',
        'A marketplace wants to know whether a new ranking model improves useful clicks without reducing successful purchases.',
        'Could a higher click rate be a bad outcome if purchases fall or one group sees worse results?',
        'A/B testing compares assigned variants under an experiment design. Choose a unit that avoids contamination, define one primary outcome and guardrails, and account for duration and repeated peeking.',
        'Randomize by user when ranking exposures repeat; track purchase completion and latency as guardrails. Check assignment balance before interpreting the outcome.',
        'Write a primary metric, one guardrail, a randomization unit, and a condition for stopping the experiment safely.',
        'An experiment answers a narrow causal question only when its assignment and measurements support that claim.'
      ],
      'Ethical AI and Bias Mitigation': [
        'Identify a consequential failure and choose evaluation slices and mitigations that fit the actual decision.',
        'A hiring support model ranks applications, and review shows different error rates across job families.',
        'Which groups and outcomes matter, and what decision is the model permitted to influence?',
        'Fairness is context-dependent. Inspect data coverage, label quality, error rates by relevant groups, and downstream effects. Interpretation tools such as permutation importance explain model behavior only under assumptions; correlated features and subgroup shifts can mislead.',
        'Compare false-negative rates by relevant population, then use a held-out representative set to inspect important features and example-level errors. Ask accountable stakeholders whether the proposed use is appropriate.',
        'Define an audit slice, one harmful error, one interpretation check and its limitation, a human-review safeguard, and evidence that would cause the team to pause deployment.',
        'Responsible evaluation includes who bears errors and whether the use should proceed at all.'
      ],
      'ML Pipeline Automation': [
        'Assemble a reproducible model workflow and present evidence, limitations, and a next experiment.',
        'A small operations team wants to forecast equipment service needs from historical sensor summaries before planning inspections.',
        'What decision will a forecast change, what data exists at prediction time, and how will success be measured?',
        'Project: define the decision and intended user; inspect a documented dataset; create a time-aware split; establish a baseline; engineer and version features; compare a justified model; evaluate suitable metrics and slices; interpret errors; document a bounded serving and monitoring plan.',
        'For rare failures, report precision-recall behavior and the workload implied by alerts. Keep an untouched future period for final evaluation and never treat a public sample as production evidence.',
        'Present the question, data provenance, feature choices, baseline/model comparison, evaluation, interpretation, failure limits, responsible-use boundary, and next experiment. Reproduce the result from recorded code and configuration.',
        'A model is ready for review when its evidence can be reproduced and its limits guide the next decision. This platform does not store learner project submissions.'
      ]
    }
  },
  aws_architect: {
    objective: 'By the end, you will turn workload requirements into a secure, resilient AWS architecture proposal and explain service choices, trade-offs, failure recovery, monitoring, and cost. Basic networking concepts are helpful; no AWS account or deployment is required. Plan for about 10 hours. Your outcome is a diagram and decision record for a small scalable web application.',
    modules: {
      'AWS Core Services': 'Translate workload requirements into network, compute, and data choices with explicit access and availability boundaries.',
      'Storage and Database Services': 'Match object, relational, key-value, warehouse, and migration services to data shape and access patterns.',
      'Networking and Content Delivery': 'Design name resolution, traffic distribution, private connectivity, and edge delivery around latency and failure needs.',
      'Security, Identity, and Compliance': 'Apply least privilege, encryption, certificate management, security findings, and a reviewable architecture proposal.'
    },
    lessons: {
      'Introduction to AWS': [
        'Convert a workload brief into requirements before selecting cloud services.',
        'A local retailer plans to launch a product website, expects uncertain traffic, and must protect customer orders.',
        'What availability, data, latency, recovery, and budget needs would change the design?',
        'Cloud architecture maps requirements to components and their interactions. AWS operates across regions and availability zones, but service choice, configuration, and shared-responsibility controls remain design decisions.',
        'Write measurable targets such as expected peak requests, acceptable recovery time, data retention, and monthly budget before drawing the first service box.',
        'Create five questions for a product owner that would guide a first architecture. Which answer is a constraint rather than a preference?',
        'Requirements make service selection explainable and testable.'
      ],
      'Amazon EC2: Virtual Servers in the Cloud': [
        'Choose virtual compute when control over the operating environment is worth its management work.',
        'A team runs a specialized background processor that needs a custom runtime not supported by its current managed platform.',
        'What operational tasks return to the team when it manages a virtual machine?',
        'EC2 provides virtual instances with configurable compute, storage, and networking. The customer manages the guest operating system, patches, capacity settings, and application while AWS operates the underlying infrastructure.',
        'Place private application instances behind a load balancer, use an instance role instead of static keys, and define scaling and patch ownership.',
        'Compare EC2 with a managed application service for a small API. Name one control EC2 adds and one maintenance responsibility it creates.',
        'Compute flexibility is valuable when the workload needs it and an owner can maintain it.'
      ],
      'Amazon S3: Object Storage Service': [
        'Use object storage for durable, access-controlled objects and choose lifecycle behavior from retrieval needs.',
        'A photo service stores original uploads, thumbnails, and temporary exports with different access patterns.',
        'Do all objects need the same retention, public access, and retrieval speed?',
        'S3 stores objects in buckets with policies, versioning, encryption options, and lifecycle transitions. It is not a mounted relational database; design access and recovery explicitly.',
        'Keep original uploads private, serve authorized content through an application or controlled distribution path, and expire temporary exports after their business need ends.',
        'Classify three example files by access, retention, and recovery requirement. What bucket policy mistake could expose all customer images?',
        'Object durability does not automatically provide the right access policy or recovery plan.'
      ],
      'Amazon RDS: Relational Database Service': [
        'Choose a managed relational database for structured relationships and define backups, availability, and connection limits.',
        'Orders, customers, and payments must remain consistent when checkout writes several related records.',
        'Would separate uncoordinated files preserve these relationships reliably?',
        'RDS manages relational database infrastructure and common operational tasks. The workload still needs schema design, access control, capacity planning, backups, and tested recovery.',
        'Use a private database subnet, narrowly scoped application access, automated backups, and connection pooling appropriate to expected concurrency.',
        'List the recovery point and recovery time a checkout system needs. Which backup and failover decisions must be tested rather than assumed?',
        'Managed operations reduce some work, but data consistency and recovery remain architecture responsibilities.'
      ],
      'Amazon VPC: Isolating Cloud Resources': [
        'Draw a VPC path that separates public entry points from private application and data resources.',
        'A prototype places the web server and database on public addresses to make setup easy.',
        'Which components need inbound internet traffic, and which should only receive internal requests?',
        'A VPC defines a virtual network with subnets, routes, and security controls. Public reachability depends on routing and gateways, not merely the subnet name.',
        'Route internet traffic to a public load balancer; keep app instances and database in private subnets; permit only the required app-to-database port.',
        'Sketch public and private subnets plus one request flow. Mark where a route, security group, and database access rule each apply.',
        'Network isolation is a set of explicit paths and permissions, not a label alone.'
      ],
      'AWS Storage Options': [
        'Compare block, object, and shared file storage by access pattern, performance, and operating need.',
        'A workload needs boot volumes, user-uploaded documents, and shared files used by several application instances.',
        'Would the same storage interface suit all three jobs?',
        'Block storage presents volumes to compute; object storage exposes objects through APIs; file storage provides shared directories. Durability, latency, concurrency, and cost differ.',
        'Use a boot volume for an instance, an object bucket for uploads, and shared file storage only if several instances require filesystem semantics.',
        'Match each storage need to a type and state one operational or cost trade-off for your choice.',
        'Select storage from the way the application reads and writes data.'
      ],
      'Amazon DynamoDB: NoSQL Database': [
        'Design a key-value access pattern before choosing a NoSQL table for predictable high-scale lookups.',
        'A game service retrieves each player’s current session by player ID and updates a small set of session fields.',
        'Does the product need flexible joins, or a very fast lookup by known key?',
        'DynamoDB is a managed key-value and document database. Its partition and sort keys should be designed from access patterns; ad hoc relational joins are not its strength.',
        'A table keyed by player ID can serve the session read directly. Add a secondary index only for a real query and consider hot keys and item-size limits.',
        'List the reads and writes for a session service, then propose a primary key. Which new query might require a different index or data model?',
        'NoSQL performance follows from an intentional data model and known access patterns.'
      ],
      'Amazon Redshift: Data Warehousing': [
        'Separate analytical workloads from transactional operations and select a warehouse only when the reporting need warrants it.',
        'Analysts run large historical sales summaries that slow down the database used for checkout.',
        'Should long scans compete with customer transactions on the same workload?',
        'A data warehouse is optimized for analytical queries over large datasets. Redshift can support these workloads, but ingestion, retention, concurrency, and cost need a plan.',
        'Copy curated daily sales facts into an analytical store, restrict sensitive columns, and refresh on a schedule suited to reporting needs.',
        'Decide whether a small business with weekly summaries needs a warehouse yet. What volume or query pattern would justify the added service?',
        'A scalable warehouse is useful when the analysis workload and operating cost justify it.'
      ],
      'AWS Database Migration Service': [
        'Plan a database migration around compatibility, data validation, downtime, rollback, and ownership.',
        'An online store must move an older order database while keeping new purchases available.',
        'How will the team know every record and update arrived correctly before switching users?',
        'A migration service can replicate and transform data, but it does not remove schema differences, application compatibility checks, or cutover planning.',
        'Inventory schemas, run a test migration, compare counts and sampled checksums, capture ongoing changes, rehearse cutover, and retain a rollback window.',
        'Write a go/no-go checklist with one data-validation condition, one downtime limit, and one rollback trigger.',
        'A migration is complete only when the data and application behavior are verified.'
      ],
      'Amazon Aurora: MySQL and PostgreSQL Compatible': [
        'Compare a managed compatible relational engine with a standard database option against workload and operational requirements.',
        'A service needs relational transactions and expects seasonal growth but has no database operations team.',
        'Which requirement is about compatibility, and which is about availability or scale?',
        'Aurora provides managed relational engines compatible with MySQL or PostgreSQL interfaces. Compatibility does not mean identical behavior, features, cost, or migration effort.',
        'Prototype critical queries and drivers, test failover and restore time, and compare projected usage and storage costs before a move.',
        'List two compatibility checks and one cost question before selecting Aurora for an existing application.',
        'A service label is not an architecture decision; validate the exact workload and operating model.'
      ],
      'Amazon CloudFront: CDN Service': [
        'Use edge delivery to improve access to cacheable content while planning invalidation and origin protection.',
        'Visitors in several countries download the same product images from one origin location.',
        'Which content can be cached safely, and what must remain private or current?',
        'A content delivery network caches eligible responses near users. Cache keys, time-to-live, origin access, and invalidation determine correctness and exposure.',
        'Cache versioned public assets for a long period; use private distribution controls for protected files and avoid caching user-specific account responses publicly.',
        'Classify product images, account pages, and a versioned stylesheet as public-cacheable, private, or short-lived. Explain the freshness tradeoff.',
        'Caching improves latency only when the content and access policy are safe to reuse.'
      ],
      'Amazon Route 53: DNS Web Service': [
        'Explain how DNS records direct a name to an endpoint and why a DNS change is not an instant failover guarantee.',
        'A team changes its application hosting and expects users to reach the new target immediately.',
        'What cached answer might a resolver still be using?',
        'DNS maps names to records with a time-to-live. Route policies can support routing decisions, but client and resolver caching plus health-check timing affect failover.',
        'Lower a record’s TTL before a planned migration, validate the new destination, then preserve the old endpoint through the transition window.',
        'Create a migration sequence for a hostname. What must be verified before changing the record and after the TTL period?',
        'DNS is part of traffic management; plan for caching and observation.'
      ],
      'AWS Load Balancing': [
        'Choose a load balancer type from protocol, traffic, health, and routing requirements.',
        'A web application has two instances, but traffic still goes to one even after it stops responding.',
        'What signal tells the traffic layer that an instance is ready and healthy?',
        'A load balancer distributes requests across targets and performs health checks. Application and network load balancers serve different protocol and routing needs; health checks must test meaningful readiness.',
        'Route HTTPS requests by host or path to healthy application targets, keep instances private, and confirm a failed target is removed without dropping all traffic.',
        'Pick a load-balancing behavior for a web API and a non-HTTP TCP service. What should the health check test for each?',
        'Traffic distribution improves resilience when health signals and target capacity are sound.'
      ],
      'AWS Direct Connect: Dedicated Network Connection': [
        'Decide whether dedicated connectivity is justified by predictable traffic, latency, or data-transfer requirements.',
        'A company sends large data sets between its office network and cloud environment every day.',
        'Would a dedicated circuit solve an application availability problem by itself?',
        'Direct Connect provides a dedicated network path to AWS. It needs provider coordination, routing design, and a separate resilience plan; it is not automatically encrypted end to end.',
        'Use private connectivity for steady hybrid transfer if the cost and lead time fit, and add independent connectivity or VPN recovery for outages.',
        'List the reason to use dedicated connectivity, a failure scenario, and a separate recovery path.',
        'A private path changes connectivity characteristics but does not replace encryption or failover planning.'
      ],
      'AWS Global Accelerator': [
        'Compare global traffic acceleration with content caching and regional application design.',
        'A global API serves dynamic requests from several regions, while some static images already use a CDN.',
        'Would caching the API response be safe, and is latency caused by routing or origin processing?',
        'Global Accelerator uses AWS edge network entry points to route traffic toward configured endpoints. It does not cache application content or fix slow backend code.',
        'Use an accelerator when global network routing and endpoint failover meet a measured need; use a CDN for cacheable objects and profile server work separately.',
        'Choose between CDN, accelerator, or neither for static images, user-specific API data, and a single-region local service. State the requirement behind each choice.',
        'Edge services solve different problems; measure the bottleneck before adding one.'
      ],
      'AWS Identity and Access Management (IAM)': [
        'Apply least privilege to a workload role and distinguish user identity from resource permission.',
        'A nightly report job only needs to read one bucket, but it currently uses an administrator key.',
        'What is the smallest permission that lets the job finish?',
        'IAM policies grant or deny actions on resources under conditions. Workloads should use roles and short-lived credentials where possible; broad user keys create unnecessary exposure.',
        'Give a report role read access to a specific input prefix and write access only to its output location. Review access logs and rotate any exposed credential.',
        'Rewrite a broad “all actions on all resources” request as two narrow permissions for a fictional job.',
        'Identity and resource permissions are architecture controls that should match one named task.'
      ],
      'AWS Key Management Service (KMS)': [
        'Explain how managed encryption keys support data protection and key-access separation.',
        'A finance team encrypts stored reports but allows every application role to decrypt every file.',
        'Does encryption help if the same identities can freely obtain plaintext?',
        'KMS manages cryptographic keys and policy-controlled operations. Encryption at rest requires decisions about key access, rotation, audit, and recovery; it does not replace application authorization.',
        'Separate a data-processing role’s decrypt permission from a reporting role’s use of approved outputs, and monitor key-use events.',
        'Draw who can request encryption and decryption for a private report bucket. Identify one role that should not decrypt the data.',
        'Key policy and workload identity determine who can turn protected data back into readable data.'
      ],
      'AWS Certificate Manager': [
        'Plan certificate lifecycle and TLS termination for a public application endpoint.',
        'A site certificate expires during a campaign and visitors see browser warnings.',
        'Which component owns renewal and which endpoint presents the certificate?',
        'Certificate management provisions and renews certificates for supported AWS integrations. The architecture must still route the correct hostname, protect private keys, and validate the TLS configuration.',
        'Attach a managed certificate to the public load balancer or CDN, automate DNS validation, and monitor domain ownership and renewal status.',
        'Trace a browser HTTPS request to the certificate-bearing endpoint. What check confirms the name and renewal setup are correct?',
        'Automated certificate renewal reduces operational risk when domain and endpoint configuration are correct.'
      ],
      'AWS Security Hub': [
        'Use aggregated security findings to prioritize owned risks without treating a dashboard as a remediation plan.',
        'A team receives hundreds of alerts from several accounts and cannot tell which issue could expose customer data.',
        'What context is needed to prioritize by impact and owner?',
        'A security findings service aggregates and prioritizes signals from integrated controls. Teams must triage duplicates, assign ownership, validate context, and track remediation.',
        'Group related public-storage findings, confirm whether the objects contain sensitive data, assign an accountable owner, and record a target date and verification evidence.',
        'Rank three fictional findings by likelihood, impact, and exposure. What additional evidence could change their order?',
        'Security findings become useful when they lead to verified fixes and accountable follow-up.'
      ],
      'AWS Artifact and Compliance Reports': [
        'Distinguish provider compliance evidence from the customer’s own control responsibilities and present an architecture proposal.',
        'A startup prepares to launch a customer portal and assumes a cloud compliance report proves its application is secure.',
        'Which controls are operated by AWS, and which belong to the application team?',
        'Compliance reports describe provider controls and attestations for defined scopes and periods. Customers remain responsible for identity, application configuration, data handling, and evidence appropriate to their own obligations.',
        'Architecture proposal project: define user and workload requirements; diagram DNS, edge, network, compute, database, and storage flow; document IAM and encryption; explain scaling, availability, backup/restore, monitoring, cost assumptions, and trade-offs.',
        'Present the proposal, one failure scenario and recovery path, security boundaries, estimated cost drivers, evidence source, unresolved risks, and the next validation step. Do not claim a cloud report certifies the application.',
        'Architecture is a set of justified trade-offs and owned controls. No learner environment or cloud deployment is created by this lesson.'
      ]
    }
  },
  data_science: {
    objective: 'By the end, you will frame a decision question, inspect and prepare data, explore patterns, choose modeling only when useful, evaluate results, and communicate uncertainty and next steps. Python and basic statistics are recommended; plan for about 14 hours. Your outcome is a documented end-to-end investigation using a suitable public or synthetic dataset.',
    modules: {
      'Data Science Foundations': 'Frame a useful question and prepare trustworthy evidence through provenance checks, cleaning, exploration, and statistical reasoning.',
      'Machine Learning and Modeling': 'Choose features and models only when they serve the question, then evaluate them on data that represents future use.',
      'Big Data and Distributed Computing': 'Recognize when data scale changes tools and architecture, and justify simpler alternatives where they are sufficient.',
      'Specialized Data Science Domains': 'Communicate domain-sensitive findings and complete an investigation with clear evidence, limitations, and recommendations.'
    },
    lessons: {
      'What is Data Science?': [
        'Explain how data science combines domain questions, analysis, computation, and communication to support a decision.',
        'A transit agency wants to reduce missed connections but has timetable, vehicle, and passenger-count data collected by different teams.',
        'What decision must improve before choosing an algorithm?',
        'Data science is an end-to-end process: define a question, understand and prepare data, analyze patterns, model if appropriate, evaluate, and communicate. A model is one possible tool, not the goal.',
        'Start by defining a missed connection and who can act on the result. A clear operational summary may be more useful than a prediction model.',
        'Write one decision-focused question for a real service. Name a stakeholder, an outcome, and a simple analysis that might answer it without ML.',
        'A strong analysis begins with a decision and ends with evidence someone can use.'
      ],
      'The Data Science Lifecycle': [
        'Trace how a project revisits question, data, analysis, evaluation, communication, and action.',
        'A prototype predicts late deliveries accurately in a notebook, but the operations team cannot use its output.',
        'Which step was missed between model evaluation and a real decision?',
        'A lifecycle connects framing, data collection, preparation, exploration, modeling, evaluation, communication, and monitoring. Feedback can send a project back to an earlier question or assumption.',
        'For a late-delivery project, agree on the cutoff, inspect timestamp quality, establish a baseline, evaluate on later weeks, and give dispatchers a safe workflow for uncertain predictions.',
        'Place a late-delivery model into lifecycle stages. Identify one point where a stakeholder decision should change the next analysis step.',
        'Data work is iterative, and usefulness depends on how evidence reaches a decision.'
      ],
      'Statistics and Probability Foundations': [
        'Use summary statistics and probability language to describe uncertainty without overstating conclusions.',
        'A small pilot reports a higher completion rate, but only 12 people used the new process.',
        'Could the observed difference be ordinary variation or a selection effect?',
        'A sample statistic summarizes observed data; probability describes uncertainty under a model of outcomes. Variation, sampling method, and measurement all affect how much confidence a result deserves.',
        'Report the counts and rates in each group, selection method, and a range of plausible differences. Avoid saying the pilot proves a broad effect.',
        'Explain why 9 successes out of 12 does not guarantee a 75% success rate for every future user. What additional sample or design information matters?',
        'Statistics helps calibrate claims to evidence; it does not remove uncertainty.'
      ],
      'Data Acquisition and Cleaning': [
        'Document source, grain, missingness, duplicates, and transformations before analysis.',
        'A research team joins registrations to attendance records, but several participants registered twice and some attendance dates are blank.',
        'What does one row represent in each source, and which key supports a valid join?',
        'Data provenance records where data came from and how it was collected. Cleaning checks types, ranges, missing values, duplicates, and units while preserving an auditable raw copy.',
        'Count registration rows per participant before joining; decide whether repeated registrations are meaningful, then compare row counts and missingness after the join.',
        'List three validation checks for a join between people and events. What privacy principle limits which columns should be kept?',
        'A tidy result still needs traceable decisions and a clear account of what the data represents.'
      ],
      'Exploratory Data Analysis (EDA)': [
        'Use visual and numerical summaries to find patterns, anomalies, and questions that need follow-up.',
        'A city sees average commute time rise and wants to know whether the change affects all neighborhoods equally.',
        'Could the citywide mean hide a small group facing a much larger delay?',
        'EDA inspects distributions, missingness, unusual observations, and relevant segments. It generates hypotheses; repeated searching can produce chance patterns that need separate validation.',
        'Plot commute-time distributions by neighborhood and month, report sample counts, and check whether changes in sensor coverage could explain an apparent shift.',
        'Choose two segments and one plot for the commute question. State a pattern that would prompt investigation but would not yet justify a causal claim.',
        'Exploration makes the next question sharper; it does not by itself explain why a pattern occurred.'
      ],
      'Supervised Learning Algorithms': [
        'Choose a supervised model from target type, data size, interpretability, and baseline performance.',
        'A library predicts whether a requested book will be returned late using only information available when it is checked out.',
        'Is the target a number of days or a yes/no event, and what simple prediction should be tested first?',
        'Regression predicts numeric outcomes; classification predicts categories. Linear models, trees, and ensembles trade off assumptions, flexibility, interpretability, and compute.',
        'Compare a majority-class baseline and a small tree for late-return classification. Exclude post-return events because they would leak the outcome.',
        'Pick a baseline and one candidate for a numeric demand forecast. State the target, one usable predictor, and a reason the model fits.',
        'Choose a model for the prediction task and constraints, not for its popularity.'
      ],
      'Unsupervised Learning Techniques': [
        'Use clustering or dimension reduction to explore structure while avoiding claims that discovered groups are inherently meaningful.',
        'A museum groups visitor sessions to improve exhibit guidance but has no labels for visitor intent.',
        'Would clusters reveal genuine needs, or simply differences in visit length and device type?',
        'Clustering groups observations by a chosen distance; PCA compresses correlated numeric variation. Results depend on scaling, features, and parameters and require domain interpretation.',
        'Scale appropriate numeric session features, cluster a training sample, then profile groups and test stability across time before proposing a different visitor experience.',
        'Name a feature that could dominate distance unfairly and a check to see whether the clusters remain stable under a reasonable change.',
        'Unsupervised output is a hypothesis about structure, not a discovered ground-truth category.'
      ],
      'Model Evaluation and Validation': [
        'Design a validation split that represents future use and select metrics tied to the decision’s error costs.',
        'A fraud model is evaluated by randomly splitting individual transactions, even though many transactions belong to the same accounts and time periods.',
        'Could related transactions appear on both sides of the split and make the result look easier?',
        'Holdout and cross-validation estimate generalization only when partitions respect time, people, sites, or other dependencies. Select metrics such as precision, recall, calibration, or MAE based on the decision.',
        'Split transactions by time and account group; report recall at an alert workload and inspect performance for new accounts separately.',
        'Choose a split and primary metric for predicting next-month demand. Explain one consequence of using a random row split.',
        'Evaluation is a design decision about which future cases the reported score represents.'
      ],
      'Feature Engineering and Selection': [
        'Create features that reflect the prediction moment and test whether they add signal without leakage.',
        'A maintenance model predicts failures, and a technician proposes using the last repair date and final inspection outcome.',
        'Was the inspection outcome known when the prediction would be made?',
        'Feature engineering transforms raw fields into useful signals. Selection should consider availability, leakage, stability, privacy, and whether a feature adds value beyond a baseline.',
        'Compute days since last completed repair from records available before scoring. Fit scaling and feature selection within each training fold.',
        'Classify three candidate fields as available, leakage-prone, or sensitive for a prediction made at 8 am each day. What documentation should accompany a derived feature?',
        'A predictive feature must be available at the time of use and defensible for the decision.'
      ],
      'Model Deployment and Monitoring': [
        'Describe the data, model, interface, monitoring, and rollback pieces needed for a bounded deployment.',
        'A model predicts stock shortages in a notebook, but planners update inventory in a separate system each morning.',
        'Where will the prediction appear, and what happens when data is missing or stale?',
        'Deployment connects a versioned artifact to a repeatable input contract and an owned workflow. Monitoring covers service health, data quality, drift, and delayed outcomes.',
        'Publish a daily batch with item ID, forecast horizon, model version, and confidence range. Alert on missing inputs and allow planners to return to the existing process.',
        'Draw a small prediction flow and mark one validation check, one health signal, one owner, and one rollback trigger.',
        'A model is operational only when people can use it safely and the team can detect when it stops helping.'
      ],
      'Introduction to Big Data': [
        'Decide whether scale, speed, or data variety actually requires distributed processing.',
        'A local nonprofit has a few thousand donation rows but is considering a large distributed platform after hearing about big data.',
        'Which measurable constraint does the current spreadsheet or database fail to meet?',
        'Volume, velocity, variety, and reliability describe different data challenges. Distributed systems add coordination, network, and operational costs; they are not automatically better for small data.',
        'Profile dataset size, refresh rate, and query duration first. A well-indexed relational database may be simpler and cheaper for a modest reporting workload.',
        'Name the bottleneck that could justify distributed processing and one sign that the simpler current system remains sufficient.',
        'Use the smallest architecture that meets measured needs and leaves room to grow.'
      ],
      'Apache Hadoop Ecosystem': [
        'Explain distributed file storage and batch processing conceptually and identify when this legacy ecosystem is relevant.',
        'An archive team processes a very large, mostly static collection of logs overnight.',
        'Would a batch job suit a result needed in seconds for an interactive user?',
        'HDFS distributes large files across a cluster; MapReduce runs batch transformations near stored data. Hadoop-related tools support particular workloads but may carry substantial operational overhead.',
        'A batch task can count event types by partition, combine partial counts, and write aggregate results. Compare this with managed cloud analytics before operating a cluster.',
        'Choose batch or interactive processing for a nightly archive report and a live fraud decision. State one reason the Hadoop stack may be unnecessary.',
        'Learn the distributed processing idea and select a current tool only when requirements justify it.'
      ],
      'Apache Spark: Fast Data Processing': [
        'Describe how distributed data transformations and partitioning affect a Spark job’s performance and cost.',
        'A daily analytics job repeatedly shuffles a large table because it groups records by a key that is badly distributed.',
        'What work moves across the cluster, and could skew put most data on one worker?',
        'Spark executes transformations across partitions and may shuffle data between workers. Caching helps reused data, but excessive caching and poorly sized partitions consume resources.',
        'Inspect the execution plan, filter early, select needed columns, and measure a representative run before tuning executor settings.',
        'Find one operation likely to cause a shuffle in a group-by pipeline. Name one metric to compare before and after a change.',
        'Distributed code still needs profiling; parallelism cannot fix a poor query plan for free.'
      ],
      'NoSQL Databases': [
        'Match a NoSQL data model to access patterns and explain consistency and duplication trade-offs.',
        'A mobile app must read a user’s recent activity quickly, while analysts occasionally ask questions across all users.',
        'Can one optimized schema serve both request patterns equally well?',
        'Key-value, document, wide-column, and graph databases organize data differently. Denormalization can improve known reads but creates update consistency and duplication work.',
        'Store recent activity by user and time for the application path; send curated events to a separate analytical store rather than making one database answer every question.',
        'Choose a primary access pattern for a document store and name a query that would fit poorly. What consistency issue can duplicated fields create?',
        'Choose the data model from real reads and writes, and make trade-offs explicit.'
      ],
      'Real-time Data Processing': [
        'Distinguish event streaming from scheduled batch work and define freshness, ordering, and recovery needs.',
        'A service wants to notify a support team when a queue has been blocked for several minutes.',
        'Does the alert need every event immediately, or a periodic summary with lower cost?',
        'Streaming systems process events continuously and must account for late, duplicate, and out-of-order messages. Delivery guarantees and idempotent processing shape correctness.',
        'Aggregate queue events in short windows, use event timestamps, deduplicate by stable event ID, and alert only after a threshold persists.',
        'Choose a freshness target and duplicate-handling rule for a live service alert. When would a daily batch be the better choice?',
        'Real-time adds operational complexity; use it when the decision benefits from fresh data.'
      ],
      'Business Analytics and Intelligence': [
        'Translate analysis into a decision-ready finding with a defined metric and an accountable next action.',
        'A retailer reports that revenue rose, but managers cannot tell whether higher prices, more orders, or one seasonal product drove the change.',
        'What comparison would help the team choose an action?',
        'A business metric needs a definition, population, time window, and owner. Break a total into meaningful components and separate observed change from explanation.',
        'Compare order count, average order value, and product mix by week, then recommend a small promotion test with a follow-up measure.',
        'Write a finding with metric, period, comparison, caveat, and next step. What additional data would distinguish seasonality from a promotion effect?',
        'A recommendation is strongest when its metric and next decision are explicit.'
      ],
      'Bioinformatics and Computational Biology': [
        'Recognize the data, validation, and privacy constraints in a biological analysis without overinterpreting a pattern.',
        'A research group compares gene-expression measurements from a small cohort to identify candidates for further study.',
        'Could batch effects or repeated measures explain an apparent difference?',
        'Biological datasets often have many features, small samples, complex measurement pipelines, and sensitive provenance. Multiple testing and population limits can make apparent patterns unstable.',
        'Check sample metadata, normalize using an appropriate documented method, account for batch and participant structure, and label findings exploratory until independently validated.',
        'List one batch effect, one privacy safeguard, and one independent validation step for a fictional gene-expression result.',
        'A computational signal can prioritize research; it does not establish a medical conclusion on its own.'
      ],
      'Financial Analytics and Risk Modeling': [
        'Evaluate financial predictions with time-aware splits, calibrated risk, and clear limits on who may act.',
        'A lender tests a default-risk model and randomly mixes future repayment records into training data.',
        'Would that test reflect the information available when a real loan decision is made?',
        'Financial data changes over time and labels may arrive late. Use temporal validation, check calibration and subgroup error, document feature availability, and follow applicable governance.',
        'Train on earlier applications and evaluate on a later period. Compare predicted risk with observed outcomes by score band and relevant population.',
        'Identify one leakage path, one useful calibration check, and one human or policy review needed before a score affects applicants.',
        'Risk scores need time-valid evidence, review, and an explicit decision boundary.'
      ],
      'Healthcare Analytics and Medical Informatics': [
        'Design a healthcare analysis around a clinical workflow, missingness, privacy, and the consequences of errors.',
        'A hospital studies whether staffing levels relate to emergency department waiting time.',
        'Do staffing records and wait-time measures cover the same shifts and patient groups?',
        'Clinical data can be incomplete, sensitive, and shaped by workflow. Association does not establish a treatment effect, and tools used for care need qualified oversight and validation.',
        'Aggregate authorized records by shift, document missing periods, compare like settings, and report uncertainty without identifying individual patients.',
        'Name a selection bias, one access control, and a cautious recommendation for the fictional staffing analysis.',
        'Healthcare findings should fit the evidence, protect patients, and support qualified decisions.'
      ],
      'Geospatial Data Analysis and GIS': [
        'Combine spatial evidence with an end-to-end investigation and present a recommendation that respects data limits.',
        'A community group wants to identify neighborhoods with long walking routes to public cooling centers during heat waves.',
        'Do facility locations alone reveal who can reach them, at what time, and by which route?',
        'Geospatial analysis combines coordinates, boundaries, distance, and time. Projection, missing coverage, neighborhood aggregation, and privacy affect results; map patterns do not prove cause.',
        'Capstone investigation: define who needs support; document a public or synthetic dataset; check coordinate systems and missing areas; map access by neighborhood; compare with heat or population context; validate findings; communicate uncertainty and recommend one pilot.',
        'Present the question, data sources, cleaning, map and summary, recommendation, limits on geographic aggregation, and next data to collect. If modeling is useful, compare with a transparent distance baseline and evaluate on a separate area or period.',
        'An end-to-end data science project connects a defensible question to a bounded action. This platform does not save or assess project submissions.'
      ]
    }
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function renderLesson(_title, parts) {
  const headings = ['Learning Objective', 'Story', 'Discovery', 'Concept', 'Example', 'Challenge', 'Takeaway'];
  return parts.map((text, i) => `<section class="lesson-section"><h3>${headings[i]}</h3><p>${escapeHtml(text)}</p></section>`).join('\n');
}

module.exports = { courses, renderLesson };
