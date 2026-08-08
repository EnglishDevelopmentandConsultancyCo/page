/**
 * DEMO SEED DATA
 * Mirrors the shape of records the real Apps Script API returns,
 * so switching EDC_CONFIG.DEMO_MODE to false requires no frontend
 * rewrites — only real data replaces this file's role.
 * IMPORTANT: contains no real applicant information (see spec §104).
 */
window.EDC_DEMO = {

  siteSettings: {
    company_name: "English Development Consultants",
    short_name: "EDC",
    tagline: "Placing exceptional English teachers across Thailand.",
    description: "EDC partners with schools throughout Thailand to recruit, screen, and place qualified English teachers — and helps educators build lasting careers here.",
    logo_initials: "EDC",
    phone: "+66 2 123 4567",
    email: "info@edc-thailand.example",
    address: "19th Floor, Sathorn Nakorn Tower, Silom, Bangkok 10500, Thailand",
    hours: "Mon–Fri, 9:00–18:00 (Asia/Bangkok)",
    map_lat: 13.7245,
    map_lng: 100.5296,
    social: { facebook: "#", linkedin: "#", instagram: "#", youtube: "#" },
    theme: "default",
    maintenance_mode: false,
    announcement_banner: {
      enabled: true,
      message: "2026–2027 academic year recruitment is now open.",
      link_label: "View openings",
      link_url: "careers.html",
    },
  },

  navigation: [
    { label: "Home", url: "index.html" },
    { label: "About", url: "about.html" },
    { label: "Services", url: "services.html" },
    { label: "Teachers", url: "teachers.html" },
    { label: "Careers", url: "careers.html" },
    { label: "Contact", url: "contact.html" },
  ],

  services: [
    { id: "SVC-001", title: "Teacher Recruitment", short: "End-to-end sourcing, screening and placement of qualified English teachers.", icon: "🎓" },
    { id: "SVC-002", title: "Visa & Work Permit Support", short: "Guidance through Thai immigration and labour requirements for foreign teachers.", icon: "🛂" },
    { id: "SVC-003", title: "School Partnerships", short: "Long-term staffing partnerships with primary, secondary and language schools.", icon: "🏫" },
    { id: "SVC-004", title: "Onboarding & Orientation", short: "Structured orientation so new teachers settle in quickly and confidently.", icon: "🧭" },
  ],

  testimonials: [
    { name: "Sarah M.", role: "English Teacher, Chiang Mai", quote: "EDC handled my visa paperwork end to end and matched me with a school that actually fit how I teach.", featured: true },
    { name: "David K.", role: "English Teacher, Bangkok", quote: "The application process was clear from day one — I always knew exactly what stage I was at.", featured: true },
    { name: "Nattapong S.", role: "Academic Director, Partner School", quote: "EDC pre-screens candidates thoroughly, which saves our interview panel a huge amount of time.", featured: true },
  ],

  teachers: [
    { id: "TCH-000001", name: "Emily Carter", position: "Senior English Teacher", subjects: ["IELTS", "Academic English"], location: "Bangkok", nationality: "United Kingdom", years: 8, years_thailand: 5, bio: "Emily specializes in exam preparation and upper-secondary academic writing, with a background in international curricula.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80", featured: true },
    { id: "TCH-000002", name: "James Whitfield", position: "Primary English Teacher", subjects: ["Phonics", "Young Learners"], location: "Chiang Mai", nationality: "Canada", years: 6, years_thailand: 3, bio: "James builds phonics-first foundations for young learners using playful, structured classroom routines.", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80", featured: true },
    { id: "TCH-000003", name: "Priya Nair", position: "Business English Trainer", subjects: ["Business English", "Presentation Skills"], location: "Bangkok", nationality: "India", years: 10, years_thailand: 4, bio: "Priya trains corporate teams across finance and hospitality sectors on workplace English and presentation delivery.", photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80", featured: true },
    { id: "TCH-000004", name: "Liam O'Connor", position: "Secondary English Teacher", subjects: ["Literature", "Grammar"], location: "Phuket", nationality: "Ireland", years: 4, years_thailand: 2, bio: "Liam brings a literature-rich approach to secondary classrooms, encouraging discussion-based learning.", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80", featured: false },
  ],

  jobs: [
    { id: "JOB-000101", title: "General English Teacher", subject: "General English", type: "Full-Time", campus: "Bangkok — Sathorn Campus", salary: "฿45,000–55,000/month", start_date: "May 2026", status: "Published", featured: true,
      description: "We're seeking a full-time General English teacher for our Bangkok campus, teaching mixed-level adult and teen classes.",
      requirements: ["Bachelor's degree (any field)", "TEFL/TESOL certificate (120hrs+)", "Native or near-native English fluency"],
      benefits: ["Work permit sponsorship", "Health insurance", "Paid holidays", "Annual flight allowance"] },
    { id: "JOB-000102", title: "IELTS Instructor", subject: "IELTS Preparation", type: "Part-Time", campus: "Chiang Mai Campus", salary: "฿700–900/hour", start_date: "Immediate", status: "Published", featured: true,
      description: "Part-time IELTS instructor needed for evening and weekend exam-prep classes in Chiang Mai.",
      requirements: ["IELTS band 8+ or equivalent teaching credential", "2+ years exam-prep experience", "CELTA/DELTA preferred"],
      benefits: ["Flexible schedule", "Competitive hourly rate", "Materials provided"] },
    { id: "JOB-000103", title: "Primary Homeroom English Teacher", subject: "Primary Education", type: "Full-Time", campus: "Phuket Campus", salary: "฿48,000–58,000/month", start_date: "August 2026", status: "Published", featured: false,
      description: "Homeroom teacher for a Primary 3 class following a bilingual curriculum in Phuket.",
      requirements: ["Bachelor's degree in Education preferred", "TEFL certificate", "Experience with young learners"],
      benefits: ["Housing allowance", "Work permit sponsorship", "Professional development budget"] },
  ],

  faqs: [
    { q: "Do I need a degree to apply?", a: "Most teaching positions require a bachelor's degree in any field, plus a TEFL/TESOL certificate of at least 120 hours." },
    { q: "Does EDC sponsor work permits?", a: "Yes — EDC guides every hired teacher through the Thai visa and work permit process." },
    { q: "How long does the application process take?", a: "Typically 2–4 weeks from submission to offer, depending on the role and interview scheduling." },
  ],

  gallery: [
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=700&q=80",
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=700&q=80",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=700&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=700&q=80",
    "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=700&q=80",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=700&q=80",
  ],

  applicants: [
    { id: "APP-000123", name: "Anna Petrova", position: "General English Teacher", campus: "Bangkok — Sathorn Campus", date: "2026-07-28", experience: "6 yrs", thailand_experience: "2 yrs", visa: "Tourist (expiring)", work_permit: "None", status: "Interview Requested", assigned: "Admin — Somchai" },
    { id: "APP-000124", name: "Marco Bellini", position: "IELTS Instructor", campus: "Chiang Mai Campus", date: "2026-07-30", experience: "9 yrs", thailand_experience: "5 yrs", visa: "Non-B", work_permit: "Active", status: "Under Review", assigned: "Admin — Nok" },
    { id: "APP-000125", name: "Grace Muthoni", position: "Primary Homeroom English Teacher", campus: "Phuket Campus", date: "2026-08-01", experience: "3 yrs", thailand_experience: "0 yrs", visa: "None", work_permit: "None", status: "Submitted", assigned: "Unassigned" },
    { id: "APP-000126", name: "Tom Everly", position: "General English Teacher", campus: "Bangkok — Sathorn Campus", date: "2026-08-03", experience: "12 yrs", thailand_experience: "8 yrs", visa: "Non-B", work_permit: "Active", status: "Shortlisted", assigned: "Admin — Somchai" },
    { id: "APP-000127", name: "Yuki Tanaka", position: "IELTS Instructor", campus: "Chiang Mai Campus", date: "2026-08-05", experience: "5 yrs", thailand_experience: "1 yr", visa: "Education", work_permit: "None", status: "Offer Sent", assigned: "Admin — Nok" },
  ],

  comments: [
    { id: "CMT-0001", name: "Anonymous", message: "Could you add more IELTS prep openings outside Bangkok?", page: "Careers", status: "Approved", date: "2026-08-02" },
    { id: "CMT-0002", name: "Ploy R.", message: "Loved reading the teacher profiles — very reassuring before applying.", page: "Teachers", status: "Approved", date: "2026-08-04" },
  ],

  dashboardStats: {
    total_applicants: 214, new_applications: 18, under_review: 34, shortlisted: 21,
    interviews: 12, offers: 6, hired: 47, rejected: 63,
  },
};
