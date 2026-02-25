import { useParams, Navigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MapPin, Phone, Mail, Clock, CheckCircle } from "lucide-react";

interface Section {
  heading: string;
  content: string;
  list?: string[];
}

interface ContentType {
  title: string;
  intro?: string;
  sections?: Section[];
  grid?: Section[];
  component?: string;
}

const policyContent: Record<string, ContentType> = {
  about: {
    title: "About PawnaHavenCamp",
    intro:
      "PawnaHavenCamp is an online booking platform that helps customers discover and book verified villas, cottages, and camping stays near Pawna Lake and Lonavala.",
    sections: [
      {
        heading: "Who We Are",
        content:
          "Our goal is to provide a simple, secure, and reliable platform where travelers can find the best stays for family trips, corporate outings, and weekend getaways. We work directly with property owners to list verified accommodations and ensure transparent pricing, availability, and smooth booking experiences.",
      },
      {
        heading: "Our Mission",
        content:
          "To make Pawna Lake and Lonavala travel planning easy, affordable, and hassle-free through a trusted digital platform.",
      },
    ],
    grid: [
      {
        heading: "Verified Villas",
        content:
          "Handpicked luxury villas with verified amenities and transparent pricing for a premium stay experience.",
      },
      {
        heading: "Cottages & Farm Stays",
        content:
          "Cozy cottages and farm stays surrounded by nature, perfect for peaceful getaways with family.",
      },
      {
        heading: "Lakeside Camping",
        content:
          "Scenic lakeside camping setups with all essentials for a memorable outdoor adventure near Pawna Lake.",
      },
      {
        heading: "Group & Corporate Bookings",
        content:
          "Tailored packages for team outings, corporate retreats, and large group celebrations.",
      },
      {
        heading: "Secure Online Payments",
        content:
          "Safe and hassle-free payment processing through authorized payment gateways for every booking.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    intro:
      "Welcome to PawnaHavenCamp. By accessing or using our website (www.pawnahavencamp.com), you agree to the following terms. PawnaHavenCamp operates as a marketplace intermediary platform and does not own or control the listed properties.",
    sections: [
      {
        heading: "1. Marketplace Intermediary Disclaimer",
        content:
          "PawnaHavenCamp (www.pawnahavencamp.com) operates solely as an online marketplace platform that connects customers with independent villa owners, camping operators, and cottage owners near Lonavala and Pawna Lake. PawnaHavenCamp is not the owner, operator, or manager of any listed property. All properties listed on the Platform are owned and operated by independent third-party property owners.",
      },
      {
        heading: "2. Limitation of Liability",
        content:
          "PawnaHavenCamp shall not be held responsible or liable for any of the following:",
        list: [
          "Any injury, death, accident, violence, illegal activity, or misconduct occurring at the property",
          "Any dispute between customer and property owner",
          "Theft, loss of belongings, or property damage",
          "Quality of stay, hygiene, safety standards, or service deficiencies",
          "Cancellation or denial of entry by property owner",
          "Any local law violations by property owner or guest",
        ],
      },
      {
        heading: "",
        content:
          "All responsibility related to on-site safety, security, services, and compliance lies solely with the respective Property Owner.",
      },
      {
        heading: "3. Payment Collection Authorization",
        content:
          "PawnaHavenCamp is authorized by listed property owners to collect 30% advance booking payment through its online payment gateway. The remaining amount (70%) shall be paid directly to the property owner at check-in unless otherwise specified. The Platform is not responsible for offline payment disputes between customer and property owner.",
      },
      {
        heading: "4. User Conduct & Prohibited Activities",
        content:
          "Customers agree to the following terms regarding their conduct:",
        list: [
          "They shall not engage in illegal activities, violence, drug abuse, or unlawful behavior at the property",
          "They are solely responsible for their conduct during the stay",
          "Any legal consequences arising from guest behavior shall be borne by the guest",
        ],
      },
      {
        heading: "5. Indemnification Clause",
        content:
          "Users and Property Owners agree to indemnify and hold harmless PawnaHavenCamp, its founders, employees, and affiliates from any claims, legal actions, damages, or losses arising out of:",
        list: [
          "Property-related incidents",
          "Customer misconduct",
          "Violation of local laws",
          "Breach of agreement by Property Owner",
        ],
      },
      {
        heading: "6. Force Majeure",
        content:
          "PawnaHavenCamp shall not be liable for failure or delay in performance due to events beyond reasonable control including natural disasters, government restrictions, pandemics, or civil disturbances.",
      },
      {
        heading: "7. Booking & Availability",
        content:
          "All bookings are subject to availability. Prices may vary based on season and availability. Cancellation policies may vary by property. Please check the cancellation terms before booking.",
      },
    ],
  },
  services: {
    title: "Our Services",
    intro:
      "PawnaHavenCamp provides premium accommodation and hospitality services near Pawna Lake and Lonavala.",
    grid: [
      {
        heading: "Luxury Accommodations",
        content:
          "We offer high-end glamping domes, cozy cottages, and private villas designed for comfort and luxury.",
      },
      {
        heading: "Dining Services",
        content:
          "Authentic local meals (Veg and Non-Veg options) are included in most packages, prepared fresh by our local chefs.",
      },
      {
        heading: "Event Hosting",
        content:
          "Our properties are perfect for small gatherings, birthdays, and corporate retreats.",
      },
      {
        heading: "Activities",
        content:
          "Boating, trekking, and campfire arrangements are available to make your stay memorable.",
      },
    ],
  },
  "refund-policy": {
    title: "Refund & Cancellation Policy",
    intro: "Cancellation terms may vary depending on the property selected.",
    sections: [
      {
        heading: "Standard Cancellation Policy",
        content:
          "If not specified by the property, the following standard policy applies:",
        list: [
          "7 days before check-in: 100% refund",
          "3-6 days before check-in: 50% refund",
          "Less than 3 days before check-in: No refund",
        ],
      },
      {
        heading: "Important Notes",
        content:
          "Refunds will be processed within 5-7 business days. Payment gateway charges (if any) may be deducted. In case of natural calamities or government restrictions, refund decisions will be case-based.",
      },
      {
        heading: "For Cancellation Requests",
        content: "Email: hrushikeshmore2609@gmail.com | Phone: 8806092609",
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    intro:
      "We respect your privacy and are committed to protecting your personal information. PawnaHavenCamp operates as a marketplace intermediary platform and does not own or control the listed properties.",
    sections: [
      {
        heading: "1. Information We Collect",
        content:
          "We may collect the following information when you use our platform:",
        list: [
          "Name",
          "Contact number",
          "Email address",
          "Booking details",
          "Payment confirmation details",
        ],
      },
      {
        heading: "",
        content:
          "We do not store debit/credit card details. Payments are processed securely via authorized payment gateway providers.",
      },
      {
        heading: "2. Use of Information",
        content: "Information is used only for:",
        list: [
          "Booking confirmation",
          "Customer support",
          "Communication with property owners",
          "Legal compliance",
        ],
      },
      {
        heading: "",
        content:
          "We do not sell, rent, or misuse user data.",
      },
      {
        heading: "3. Data Sharing",
        content:
          "We may share booking details with the respective Property Owner only for booking fulfillment.",
      },
      {
        heading: "4. Data Security",
        content:
          "We implement reasonable technical and organizational measures to protect personal data.",
      },
      {
        heading: "5. Third-Party Services",
        content:
          "Payments are processed through secure third-party payment gateway providers. PawnaHavenCamp is not responsible for third-party technical failures.",
      },
      {
        heading: "Contact for Privacy Concerns",
        content: "Email: hrushikeshmore2609@gmail.com | Phone: 8806092609",
      },
    ],
  },
  contact: {
    title: "Contact PawnaHavenCamp",
    component: "contact",
  },
};

const ContactPage = () => (
  <div className="space-y-8">
    <p className="text-muted-foreground text-lg leading-relaxed">
      Have questions or need help with your booking? We're here to assist you.
    </p>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-6 bg-secondary/20 rounded-2xl border border-border/40 space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Our Address</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          At Post - Sate
          <br />
          Tal - Maval
          <br />
          Dist - Pune
          <br />
          Maharashtra - 412106
        </p>
      </div>

      <div className="p-6 bg-secondary/20 rounded-2xl border border-border/40 space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Phone</h3>
        <a
          href="tel:+918806092609"
          className="text-primary hover:underline text-lg font-medium block"
        >
          +91 88060 92609
        </a>
      </div>

      <div className="p-6 bg-secondary/20 rounded-2xl border border-border/40 space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Email</h3>
        <a
          href="mailto:hrushikeshmore2609@gmail.com"
          className="text-primary hover:underline font-medium block"
        >
          hrushikeshmore2609@gmail.com
        </a>
      </div>

      <div className="p-6 bg-secondary/20 rounded-2xl border border-border/40 space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Business Hours</h3>
        <p className="text-muted-foreground font-medium">
          9:00 AM - 8:00 PM
          <br />
          <span className="text-sm">All Days</span>
        </p>
      </div>
    </div>
  </div>
);

const InformationPage = () => {
  const { type } = useParams<{ type: string }>();
  const content = policyContent[type as keyof typeof policyContent];

  if (!content) {
    return <Navigate to="/404" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-display font-bold mb-8 text-primary">
            {content.title}
          </h1>

          {content.component === "contact" ? (
            <ContactPage />
          ) : (
            <div className="prose prose-gold max-w-none space-y-8 text-muted-foreground">
              {content.intro && (
                <p className="text-lg leading-relaxed">{content.intro}</p>
              )}

              {content.sections && (
                <div className="space-y-6">
                  {content.sections.map((section, idx) => (
                    <section
                      key={idx}
                      className="p-6 bg-secondary/10 rounded-2xl border border-border/20"
                    >
                      {section.heading && (
                        <h2 className="text-xl font-bold text-foreground mb-3">
                          {section.heading}
                        </h2>
                      )}
                      <p className="leading-relaxed">{section.content}</p>
                      {section.list && (
                        <ul className="mt-3 space-y-2">
                          {section.list.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              )}

              {content.grid && (
                <div className="grid md:grid-cols-2 gap-6">
                  {content.grid.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-6 bg-secondary/20 rounded-2xl border border-border/40"
                    >
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {item.heading}
                      </h3>
                      <p className="text-sm leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InformationPage;
