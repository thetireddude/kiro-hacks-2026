# Requirements Document

## Introduction

The Headline Discovery Agent is the core intelligence engine of the New News application. When triggered, it autonomously discovers high-quality, current, event-level news topics using an iterative reasoning loop powered by an OpenAI ChatGPT model with tool/function calling. The agent calls `fetch_sources` (backed by Tavily) and `cluster_sources` tools across multiple iterations to gather, deduplicate, cluster, and validate news sources into structured Topic objects. The output is a list of structured topics conforming to the Topic contract, returned via a `POST /api/agent` endpoint. A minimal card-based UI displays the results and supports reload. Topics are cached in `sessionStorage` so the agent only runs on initial load when no cached topics exist.

## Glossary

- **Agent**: The server-side OpenAI ChatGPT model instance that orchestrates topic discovery through iterative tool calling
- **Agent_Loop**: The iterative process in `lib/agent/loop.ts` where the Agent calls tools, evaluates results, and refines queries until exit conditions are met
- **Topic**: A structured object representing a single real-world news event, validated and ready for frontend rendering (defined in `lib/types.ts`)
- **TopicSource**: A structured object representing a single source article associated with a Topic
- **RawSource**: An internal agent type representing an unprocessed source returned by `fetch_sources`, never exposed to the frontend
- **SourceCluster**: An internal agent type representing a group of RawSources clustered around a single event
- **fetch_sources**: An agent tool that accepts a search query string and returns RawSource objects via Tavily search
- **cluster_sources**: An agent tool that groups RawSources into event-level SourceClusters and filters out broad themes
- **Agent_Config**: The configuration object in `lib/config.ts` containing all tunable agent parameters
- **API_Route**: The `POST /api/agent` endpoint that triggers the Agent_Loop and returns an AgentResponse or AgentErrorResponse
- **Feed_Page**: The homepage (`app/page.tsx`) that displays Topic cards and handles reload interactions
- **Session_Cache**: The `sessionStorage`-based cache that persists topics within a browser tab session

## Requirements

### Requirement 1: Agent Configuration

**User Story:** As a developer, I want all agent parameters to be centralized in a configuration file, so that I can tune agent behavior without modifying logic code.

#### Acceptance Criteria

1. THE Agent_Config SHALL define a `targetTopicCount` parameter with a default value of 5
2. THE Agent_Config SHALL define a `maxIterations` parameter with a default value of 3
3. THE Agent_Config SHALL define a `minSourcesPerTopic` parameter with a default value of 2
4. THE Agent_Config SHALL define a `maxRepresentativeSourcesPerTopic` parameter with a default value of 4
5. THE Agent_Config SHALL define a `model` parameter for the OpenAI model identifier, with a default value of `gpt-4o`
6. THE Agent_Config SHALL define a `temperature` parameter for the OpenAI model, with a default value of 0.3
7. THE Agent_Config SHALL be exported from `lib/config.ts`

### Requirement 2: Agent Loop Initialization

**User Story:** As a developer, I want the agent loop to initialize with clean state each time it runs, so that previous runs do not contaminate new results.

#### Acceptance Criteria

1. WHEN the Agent_Loop is triggered, THE Agent_Loop SHALL initialize an empty source pool of RawSource objects
2. WHEN the Agent_Loop is triggered, THE Agent_Loop SHALL initialize an empty cluster list of SourceCluster objects
3. WHEN the Agent_Loop is triggered, THE Agent_Loop SHALL initialize an empty valid topics list
4. WHEN the Agent_Loop is triggered, THE Agent_Loop SHALL set the iteration counter to 0

### Requirement 3: Broad Discovery (First Iteration)

**User Story:** As a user, I want the agent to cast a wide net on its first pass, so that it captures a diverse range of current events.

#### Acceptance Criteria

1. WHEN the Agent_Loop begins its first iteration, THE Agent SHALL generate 3 to 5 broad, diverse search queries covering different categories and regions
2. WHEN the Agent has generated broad queries, THE Agent SHALL call fetch_sources once per query
3. WHEN fetch_sources returns results, THE Agent_Loop SHALL accumulate all returned RawSource objects into the source pool
4. WHEN the source pool has been populated, THE Agent SHALL call cluster_sources with the full source pool
5. WHEN cluster_sources returns clusters, THE Agent_Loop SHALL evaluate each cluster for event-level specificity

### Requirement 4: Iterative Refinement

**User Story:** As a user, I want the agent to refine its search when initial results are insufficient, so that I get a complete and balanced set of topics.

#### Acceptance Criteria

1. WHILE the valid topic count is below `targetTopicCount` and the iteration counter is below `maxIterations`, THE Agent_Loop SHALL continue iterating
2. WHEN the Agent_Loop enters a refinement iteration, THE Agent SHALL analyze gaps in category coverage and regional diversity among existing clusters
3. WHEN gaps are identified, THE Agent SHALL generate targeted search queries to fill those gaps
4. WHEN new queries are generated, THE Agent SHALL call fetch_sources once per query
5. WHEN new RawSources are returned, THE Agent_Loop SHALL merge new sources into the existing source pool and deduplicate by URL
6. WHEN the source pool has been expanded, THE Agent SHALL call cluster_sources with the full deduplicated source pool and the titles of already-accepted topics

### Requirement 5: Loop Exit Conditions

**User Story:** As a developer, I want the agent loop to terminate predictably, so that the API response time remains bounded.

#### Acceptance Criteria

1. WHEN the number of valid topics reaches `targetTopicCount`, THE Agent_Loop SHALL exit the iteration loop
2. WHEN the iteration counter reaches `maxIterations`, THE Agent_Loop SHALL exit the iteration loop
3. WHEN the Agent determines that no further useful queries can be generated, THE Agent_Loop SHALL exit the iteration loop

### Requirement 6: Topic Validation

**User Story:** As a user, I want every topic to represent a real, specific event backed by credible sources, so that I receive trustworthy news.

#### Acceptance Criteria

1. THE Agent_Loop SHALL accept a cluster as a valid topic only when the cluster represents a specific, identifiable real-world event
2. THE Agent_Loop SHALL reject clusters that describe broad themes such as "US politics" or "AI trends"
3. THE Agent_Loop SHALL accept a cluster as a valid topic only when the cluster is supported by at least `minSourcesPerTopic` sources
4. THE Agent_Loop SHALL accept a cluster as a valid topic only when at least one source in the cluster has a type of "news"
5. THE Agent_Loop SHALL reject a cluster when all of the cluster sources originate from social media
6. THE Agent_Loop SHALL assign a confidence value of "high" when a topic has 3 or more strong sources, "medium" when a topic has 2 sources, and "low" when source support is limited

### Requirement 7: Topic Deduplication

**User Story:** As a user, I want to see distinct events in my feed, so that I do not encounter duplicate stories.

#### Acceptance Criteria

1. THE Agent_Loop SHALL deduplicate RawSources by URL before passing the source pool to cluster_sources
2. THE Agent_Loop SHALL not return two topics that describe the same real-world event
3. WHEN two clusters describe the same event, THE Agent_Loop SHALL merge the clusters into a single topic

### Requirement 8: Topic Finalization

**User Story:** As a user, I want the final topic list to be well-structured and balanced, so that I get a polished news feed.

#### Acceptance Criteria

1. WHEN the Agent_Loop exits the iteration loop, THE Agent_Loop SHALL select the top topics ranked by confidence and category diversity, up to `targetTopicCount`
2. THE Agent_Loop SHALL assign a unique string identifier to each finalized Topic
3. THE Agent_Loop SHALL include 2 to `maxRepresentativeSourcesPerTopic` representative TopicSource objects per Topic
4. THE Agent_Loop SHALL set the `lastUpdated` field of each Topic to a valid ISO 8601 timestamp
5. THE Agent_Loop SHALL set the `category` field of each Topic to one of: "politics", "technology", "world", "business", "science", "sports", "entertainment", "health"
6. THE Agent_Loop SHALL set the `summary` field of each Topic to 1 to 2 sentences in a neutral tone
7. THE Agent_Loop SHALL set the `title` field of each Topic to a short, event-specific headline
8. THE Agent_Loop SHALL set the `searchQuery` field of each Topic to a query string that can be used to fetch more information about the topic later

### Requirement 9: fetch_sources Tool

**User Story:** As a developer, I want a well-defined fetch_sources tool, so that the agent can retrieve current news sources from Tavily.

#### Acceptance Criteria

1. THE fetch_sources tool SHALL accept a single search query string as input
2. THE fetch_sources tool SHALL return an array of RawSource objects, each containing url, title, content, domain, publishedDate (optional), and score fields
3. THE fetch_sources tool SHALL use Tavily search to retrieve current news sources
4. IF fetch_sources encounters an error, THEN THE fetch_sources tool SHALL log the error and return an empty array instead of throwing an exception

### Requirement 10: cluster_sources Tool

**User Story:** As a developer, I want a well-defined cluster_sources tool, so that the agent can group sources into event-level topics.

#### Acceptance Criteria

1. THE cluster_sources tool SHALL accept an array of RawSource objects and an optional array of existing topic title strings
2. THE cluster_sources tool SHALL return an array of SourceCluster objects, each containing eventTitle, eventSummary, category, sources, and confidence fields
3. THE cluster_sources tool SHALL group sources by event-level similarity, not by broad theme
4. WHEN existing topic titles are provided, THE cluster_sources tool SHALL avoid creating clusters that duplicate those topics
5. IF cluster_sources encounters an error, THEN THE cluster_sources tool SHALL log the error and return an empty array instead of throwing an exception

### Requirement 11: API Route

**User Story:** As a frontend developer, I want a single API endpoint that triggers the agent and returns structured topics, so that the UI has a clean data source.

#### Acceptance Criteria

1. THE API_Route SHALL be accessible at `POST /api/agent`
2. THE API_Route SHALL accept an optional `topicCount` number in the request body to override `targetTopicCount`
3. WHEN the Agent_Loop completes successfully, THE API_Route SHALL return an AgentResponse containing a `topics` array of Topic objects and a `metadata` object with `iterations`, `totalSourcesAnalyzed`, and `timestamp` fields
4. IF the Agent_Loop fails, THEN THE API_Route SHALL return an AgentErrorResponse containing an `error` string, a `code` field set to one of "AGENT_TIMEOUT", "TOOL_FAILURE", "INSUFFICIENT_TOPICS", or "UNKNOWN", and an optional `partialTopics` array
5. THE API_Route SHALL return partial topics in the `partialTopics` field when the agent fails after discovering some valid topics
6. THE API_Route SHALL return an HTTP 200 status for successful responses and an appropriate error status for failures

### Requirement 12: Agent System Prompt

**User Story:** As a developer, I want the agent's system prompt to be defined in a dedicated file, so that the agent's behavior can be tuned independently of the loop logic.

#### Acceptance Criteria

1. THE Agent system prompt SHALL be defined in `lib/agent/system-prompt.ts`
2. THE Agent system prompt SHALL instruct the Agent to act as a neutral, factual news analyst
3. THE Agent system prompt SHALL instruct the Agent to discover event-level topics, not broad themes
4. THE Agent system prompt SHALL instruct the Agent to balance breaking news, trending topics, and globally important stories across US and world regions
5. THE Agent system prompt SHALL instruct the Agent to use social media only as a supporting signal and to require at least one credible news source per topic

### Requirement 13: Error Recovery

**User Story:** As a user, I want the system to handle failures gracefully, so that I still get results even when something goes wrong.

#### Acceptance Criteria

1. IF a fetch_sources call fails during the Agent_Loop, THEN THE Agent_Loop SHALL log the error and continue with remaining queries in the current iteration
2. IF cluster_sources fails during the Agent_Loop, THEN THE Agent_Loop SHALL return whatever valid topics exist as partialTopics in an AgentErrorResponse
3. IF the OpenAI API call fails, THEN THE Agent_Loop SHALL retry once with exponential backoff before returning an AgentErrorResponse
4. THE Agent_Loop SHALL not allow a single tool failure to terminate the entire loop

### Requirement 14: Development Logging

**User Story:** As a developer, I want structured logging during agent execution, so that I can debug and monitor the agent loop.

#### Acceptance Criteria

1. THE Agent_Loop SHALL log each iteration number with a `[AGENT]` prefix
2. THE Agent_Loop SHALL log the queries generated per iteration
3. THE Agent_Loop SHALL log the number of sources fetched per query
4. THE Agent_Loop SHALL log the number of clusters formed after each clustering call
5. THE Agent_Loop SHALL log the number of valid topics after each iteration
6. THE Agent_Loop SHALL log the total elapsed time when the loop completes

### Requirement 15: Session-Based Topic Caching

**User Story:** As a user, I want my discovered topics to persist within my browser tab, so that I do not trigger a new agent run every time I navigate back to the homepage.

#### Acceptance Criteria

1. WHEN the Agent_Loop returns topics successfully, THE Feed_Page SHALL store the topics in Session_Cache
2. WHEN the Feed_Page loads and Session_Cache contains previously stored topics, THE Feed_Page SHALL display the cached topics without triggering the Agent_Loop
3. WHEN the Feed_Page loads and Session_Cache is empty, THE Feed_Page SHALL trigger the Agent_Loop via the API_Route
4. WHEN the user clicks the "Reload Feed" button, THE Feed_Page SHALL trigger the Agent_Loop via the API_Route regardless of Session_Cache state
5. WHEN the Agent_Loop returns new topics after a reload, THE Feed_Page SHALL replace the Session_Cache contents with the new topics

### Requirement 16: Minimal Topic Display

**User Story:** As a user, I want to see the discovered topics displayed as cards, so that I can browse the news feed.

#### Acceptance Criteria

1. THE Feed_Page SHALL display each Topic as a card showing the topic title, summary, category, source count, and confidence level
2. THE Feed_Page SHALL display a "Reload Feed" button that triggers a new agent run
3. WHILE the Agent_Loop is running, THE Feed_Page SHALL display a loading state
4. WHEN the API_Route returns an AgentErrorResponse with no partialTopics, THE Feed_Page SHALL display the error message with a retry button
5. WHEN the API_Route returns an AgentErrorResponse with partialTopics, THE Feed_Page SHALL display the partial topics along with a notice that results are incomplete
6. WHEN the Agent_Loop returns zero topics, THE Feed_Page SHALL display a message indicating no topics were found along with a reload button

### Requirement 17: Topic Output Contract Enforcement

**User Story:** As a frontend developer, I want the agent to only return validated, structured Topic objects, so that the UI can render them without additional processing.

#### Acceptance Criteria

1. THE Agent_Loop SHALL return only Topic objects conforming to the Topic interface defined in `lib/types.ts`
2. THE Agent_Loop SHALL not expose RawSource objects, SourceCluster objects, or internal agent state to the API_Route response
3. THE Agent_Loop SHALL validate that each Topic has a non-empty `id`, an event-specific `title`, a `sourceCount` of at least 2, and `representativeSources` containing at least one source with type "news" before including the Topic in the response
