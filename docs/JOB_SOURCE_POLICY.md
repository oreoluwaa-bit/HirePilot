# Job source policy

HirePilot should use official, documented, and permitted interfaces wherever possible.

| Connector | Access model | Important limitation |
| --- | --- | --- |
| Greenhouse Job Board | Public GET endpoints | Requires an employer board token; application POST requires employer API credentials. |
| Lever Postings | Public postings endpoint | Requires a known site name; API does not provide global full-text search. |
| Ashby Job Posting | Public job-board endpoint | Requires a known job board name; only listed jobs should be exposed publicly. |
| Arbeitnow | Public job-board API | Strong European coverage; not a worldwide/Nigeria-focused inventory. |

## Attribution and freshness
- Preserve the original application URL.
- Display source attribution.
- Keep the source's publication/update timestamp where provided.
- Do not claim an exact publication date if the provider does not supply one.
- Respect provider terms, rate limits, and restrictions on redistribution.

## Eligibility
- A job being remote does not mean it accepts applicants from Nigeria.
- Store explicit location and country restrictions when available.
- Use an "Unverified" eligibility state when the source does not make country eligibility clear.
- Never turn missing location information into a positive eligibility claim.
