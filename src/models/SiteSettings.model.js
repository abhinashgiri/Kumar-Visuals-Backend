import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const faqSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const socialLinksSchema = new Schema(
  {
    facebook:   { type: String, trim: true },
    instagram:  { type: String, trim: true },
    twitter:    { type: String, trim: true },
    youtube:    { type: String, trim: true },
    tiktok:     { type: String, trim: true },
    soundcloud: { type: String, trim: true },
    spotify:    { type: String, trim: true },
  },
  { _id: false }
);

// --- REUSABLE HEADER SCHEMA ---
const SectionHeaderSchema = new Schema(
  {
    badge: { type: String, trim: true },    // e.g. "Professional Studio Catalog"
    title: { type: String, trim: true },    // e.g. "Music Catalog"
    subtitle: { type: String, trim: true }, // e.g. "Explore our hand-picked..."
  },
  { _id: false }
);

// --- DISCOUNT / PROMO BANNER SCHEMA ---
const discountBannerSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    imageUrl: {
      type: String,
      trim: true,
    },

    title: {
      type: String,
      trim: true,
    },

    subtitle: {
      type: String,
      trim: true,
    },

    ctaText: {
      type: String,
      trim: true,
    },

    ctaLink: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const siteSettingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },

    maintenanceMode: { type: Boolean, default: false },
    allowSignup: { type: Boolean, default: true },

    contactEmail: { type: String, trim: true },
    supportEmail: { type: String, trim: true },

    maxUploadSize: { type: Number, default: 200 },

    /* -----------------------------------
       BRANDING
    ----------------------------------- */
    logoUrl: { type: String, trim: true },   
    faviconUrl: { type: String, trim: true }, 
    brandName: { type: String, trim: true },

    /* -----------------------------------
       PAGE HEADERS (NEWLY ADDED)
    ----------------------------------- */
    
    // Shop Page Header
    shopHeader: {
      type: SectionHeaderSchema,
      default: {
        badge: "Professional Studio Catalog",
        title: "Music Catalog",
        subtitle: "Explore our hand-picked collection of premium tracks, stems, and remixes designed for high-end audio production."
      }
    },
  /* -----------------------------------
    DISCOUNT / PROMO BANNER
  ----------------------------------- */
  discountBanner: {
    type: discountBannerSchema,
    default: {
      enabled: false,
    },
  },
    // About Page - Philosophy Header
    philosophyHeader: {
      type: SectionHeaderSchema,
      default: {
        badge: "", 
        title: "Our Philosophy",
        subtitle: "Core pillars of creation"
      }
    },

    /* -----------------------------------
       ADDRESS / CONTACT
    ----------------------------------- */
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city:         { type: String, trim: true },
    state:        { type: String, trim: true },
    country:      { type: String, trim: true },
    postalCode:   { type: String, trim: true },
    phonePrimary:   { type: String, trim: true },
    phoneSecondary: { type: String, trim: true },

    aboutKumar: { type: String, trim: true },

    /* -----------------------------------
       FOOTER
    ----------------------------------- */
    footerDescription: { type: String, trim: true },
    footerCopyright: {
      type: String,
      trim: true,
      default: "© 2025 Kumar Music. All rights reserved.",
    },

    socialLinks: {
      type: socialLinksSchema,
      default: {},
    },

    faqs: { type: [faqSchema], default: [] },
  },
  { timestamps: true }
);

siteSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "global" });
  if (!doc) {
    doc = await this.create({ key: "global" });
  }
  return doc;
};

const SiteSettings = models.SiteSettings || model("SiteSettings", siteSettingsSchema);

export default SiteSettings;