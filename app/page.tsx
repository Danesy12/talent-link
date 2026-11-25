
const tracks = [
  {
    number: "01",
    title: "Skills & Credentials",
    description:
      "Showcase your education, professional experience and practical skills. Build a profile that helps employers recognize your potential.",
    icon: "✦",
  },
  {
    number: "02",
    title: "Employment Readiness",
    description:
      "Find guidance on work authorization, documentation and financial access to prepare for employment.",
    icon: "◎",
  },
  {
    number: "03",
    title: "Mentorship & Networks",
    description:
      "Connect with experienced professionals, mentors and industry networks that can support your career.",
    icon: "↗",
  },
];

export default function Home() {
  return (
    <main>
      <nav className="navbar">
        <a href="#" className="brand">
          <span className="brand-icon">T</span>
          Talent<span className="brand-light">Link</span>
        </a>

        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#pathways">Our Pathways</a>
          <a href="#impact">Our Impact</a>
        </div>

        <a href="#get-started" className="nav-button">
          Get Started ↗
        </a>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">
            OPPORTUNITY HAS NO BORDERS
          </span>

          <h1>
            Your Talent.
            <br />
            Your Future.
            <br />
            <span>Without Borders.</span>
          </h1>

          <p>
            Talent Link connects skilled refugees to meaningful
            careers, professional networks and opportunities
            to rebuild their futures.
          </p>

          <div className="hero-actions">
            <a href="#get-started" className="primary-button">
              Discover Opportunities ↗
            </a>
            <a href="#about" className="secondary-button">
              Learn More
            </a>
          </div>

          <div className="hero-note">
            <span className="online-dot"></span>
            Skills deserve recognition. Talent deserves opportunity.
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card">
            <span className="visual-label">
              YOUR POTENTIAL MATTERS
            </span>

            <div className="visual-symbol">TL</div>

            <h3>Connecting talent with opportunity.</h3>

            <p>
              Building a world where displacement does not
              define professional potential.
            </p>

            <div className="visual-footer">
              <span>Skills</span>
              <span>Careers</span>
              <span>Connections</span>
            </div>
          </div>

          <div className="floating-tag">
            ✦ Empowering talent
          </div>
        </div>
      </section>

      <section className="intro" id="about">
        <span className="section-label">
          WHY TALENT LINK?
        </span>

        <h2>
          Talent should never be lost because of
          <span> displacement.</span>
        </h2>

        <p>
          Skilled refugees bring valuable qualifications,
          technical expertise and professional experience.
          Talent Link helps bridge the gap between their
          potential and the opportunities they deserve.
        </p>
      </section>

      <section className="pathways" id="pathways">
        <div className="section-heading">
          <div>
            <span className="section-label">
              OUR APPROACH
            </span>
            <h2>Three pathways. One mission.</h2>
          </div>

          <p>
            Practical solutions to the barriers preventing
            skilled refugees from accessing employment.
          </p>
        </div>

        <div className="track-grid">
          {tracks.map((track) => (
            <article
              className="track-card"
              key={track.number}
            >
              <div className="track-top">
                <span>{track.number}</span>
                <span className="track-icon">
                  {track.icon}
                </span>
              </div>

              <h3>{track.title}</h3>
              <p>{track.description}</p>

              <a href="#get-started">
                Explore pathway ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="impact" id="impact">
        <span className="section-label">
          OUR SHARED COMMITMENT
        </span>

        <h2>Building impact beyond borders.</h2>

        <p>
          Talent Link supports the United Nations
          Sustainable Development Goals:
        </p>

        <div className="sdg-list">
          <span>SDG 4 · Quality Education</span>
          <span>SDG 8 · Decent Work</span>
          <span>SDG 10 · Reduced Inequalities</span>
          <span>SDG 16 · Strong Institutions</span>
          <span>SDG 17 · Partnerships</span>
        </div>
      </section>

      <section className="get-started" id="get-started">
        <span className="section-label">
          YOUR JOURNEY STARTS HERE
        </span>

        <h2>
          Your skills are valuable. Let the world see them.
        </h2>

        <p>
          Join Talent Link and take the first step towards
          meaningful professional opportunities.
        </p>

        <a href="#about" className="primary-button">
          Join Talent Link ↗
        </a>
      </section>

      <footer>
        <a href="#" className="brand">
          <span className="brand-icon">T</span>
          Talent<span className="brand-light">Link</span>
        </a>

        <p>
          Connecting talent. Unlocking opportunity. Transforming lives.
        </p>

        <span>© 2026 Talent Link. All rights reserved.</span>
      </footer>
    </main>
  );
}
