# Context

Your client recently heard a presentation by the founders of [Lighthouse Sanctuary](https://www.lighthousesanctuary.org/), a US-based 501(c)(3) nonprofit that operates safe homes for girls who are survivors of sexual abuse or sex trafficking in the Philippines. Lighthouse Sanctuary contracts with in-country individuals and organizations to provide safehouses and rehabilitation services and is funded from local and international donors.

Inspired by the amazing good being performed by Lighthouse Sanctuary, your client has decided to create a similar organization to assist in other regions that are lacking similar services. Fortunately, Lighthouse Sanctuary has graciously shared anonymized information about their operations to help your client understand the day-to-day operations of the organization. This includes sample operational documentation such as caseload inventory records, process recording formats (structured counseling session notes), home visitation reports, and annual accomplishment report templates. Your role is to help your client develop the technology resources needed to effectively run the new organization and to help the client understand how to collect and utilize data (like that shared by Lighthouse) to drive business decisions.

The client is engaging your services so that they can meet the following primary goals before launch:

*  The organization depends entirely on donations to operate, and the founders are constantly worried about **donor retention and growth**. They lose donors and don't always understand why. They run fundraising campaigns but aren't sure which ones actually move the needle versus just generating noise. They want to know which donors might give more if asked, which ones are at risk of lapsing, and how to personalize outreach without a dedicated marketing team. They also want to communicate to donors specifically how their generosity is benefiting the residents, but they don't have a good way to connect donation activity to outcomes.
* The organization's primary operational work is protecting and rehabilitating victims. The founders worry about **girls falling through the cracks**. With limited staff managing multiple safehouses, they need to know which girls are progressing and which are struggling, which interventions are actually working, and when a resident might be ready for reintegration or at risk of regression. They need a system to help them manage cases across the full lifecycle, from intake and case assessment through counseling, education, health services, and ultimately reintegration or placement. This includes structured counseling session documentation (process recordings), home visitation tracking, case conferences, and intervention planning.
* Social media is the organization's primary channel for reaching potential donors, but the founders freely admit they are **not experienced with social media**. They struggle with basic questions: What should they post? On which platforms? How often? What time of day? What kind of content actually leads to donations versus just generating likes? They have been posting sporadically and want to be more strategic, but they don't have a marketing team and can't afford to hire one. They need the technology to help them make smarter decisions about their social media presence and understand what is actually working.
* The organization needs to be able to **administer** and maintain any systems with limited staff. It needs to be easy to create, update, and (carefully) remove data from the system.
* All of this needs to be done using secure systems that **protect the privacy and safety** of victims, employees, donors, and partners. Given the extremely sensitive nature of the data — involving minors who are abuse survivors — privacy and data protection are paramount.

Your first order of business is recommending a name for this new organization.

# Dataset

The data for the project is provided at the following link:

* [https://drive.google.com/file/d/1Dl8AcS1ydbHKL6PU0gP6tbUPqhPsUeXZ/view?usp=sharing](https://drive.google.com/file/d/1Dl8AcS1ydbHKL6PU0gP6tbUPqhPsUeXZ/view?usp=sharing)

The dataset includes 17 tables that are available as 17 CSV files. You are also provided a data dictionary (see Appendix A) explaining the tables and fields. These tables and fields represent what Lighthouse Sanctuary has been keeping track of and your client's new organization will need to track similar data. However, you may think of additional tables and fields to add to the database that you believe would be useful and you don't have to use all of the existing data. You can modify the data as needed to meet the needs of the project.

The dataset is organized into three main domains:

**Donor and Support Domain** — Tables tracking safehouses, partners, supporters, donations (monetary, in-kind, time, skills, and social media advocacy), and donation allocations. These tables support the donor-facing and administrative features of the application.

**Case Management Domain** — Tables tracking residents (the girls served by the organization), their case information, process recordings (counseling sessions), home visitations, education records, health and wellbeing records, intervention plans, and incident reports. These tables support the core operational case management features of the application.

**Outreach and Communication Domain** — Tables tracking social media activity, engagement metrics, and public impact snapshots. These tables support the organization's social media strategy and public-facing communications.
