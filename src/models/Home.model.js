import mongoose, { Schema } from "mongoose";

/** ---------- Sub-schemas ---------- **/

// Hero stats (100+, 50K+, 4.9★ etc.)
const HeroStatSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    icon: { type: String },
  },
  { _id: false }
);

// Hero section
const HeroSectionSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    primaryButtonText: { type: String },
    primaryButtonLink: { type: String },
    secondaryButtonText: { type: String },
    secondaryButtonLink: { type: String },
    backgroundImageUrl: { type: String },
    tags: [{ type: String }],
    stats: [HeroStatSchema],
  },
  { _id: false }
);

// Categories
const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    icon: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

// Testimonials cards
const TestimonialSchema = new Schema(
  {
    name: { type: String, required: true },
    role: { type: String },
    avatarUrl: { type: String },
    rating: { type: Number, default: 5 },
    quote: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

// Why Choose Features
const WhyChooseItemSchema = new Schema(
  {
    icon: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

// --- REUSABLE HEADING SCHEMA ---
const SectionHeaderSchema = new Schema(
  {
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
  },
  { _id: false }
);

// Exclusive Mega Bundle
const MegaBundleSchema = new Schema(
  {
    isEnabled: { type: Boolean, default: false },
    badgeText: { type: String, default: "Coming Soon" },
    title: { type: String, required: true },
    subtitle: { type: String },
    description: { type: String },
    playlistsCount: { type: Number },
    discountPercent: { type: Number },
    price: { type: Number },
    originalPrice: { type: Number },
    currency: { type: String, default: "INR" },
    ctaText: { type: String, default: "Pre-Order Now" },
    ctaLink: { type: String },
    releaseDate: { type: Date },
  },
  { _id: false }
);

/** ---------- Main schema ---------- **/

const HomePageSettingSchema = new Schema(
  {
    // Hero section
    hero: { type: HeroSectionSchema, required: true },

    // Category filters
    categories: { type: [CategorySchema], default: [] },

    // --- TESTIMONIALS SECTION (Updated) ---
    testimonialsEnabled: { type: Boolean, default: true },
    
    testimonialsHeader: { 
      type: SectionHeaderSchema, 
      default: {
        title: "Trusted By Producers",
        subtitle: "Success stories from our global community"
      }
    },
    
    testimonials: { type: [TestimonialSchema], default: [] },

    // --- WHY CHOOSE SECTION (Updated) ---
    whyChooseEnabled: { type: Boolean, default: true },
    
    whyChooseHeader: { 
      type: SectionHeaderSchema, 
      default: {
        title: "Why Kumar Visuals",
        subtitle: "" 
      }
    },
    
    whyChoose: { type: [WhyChooseItemSchema], default: [] },

    // Exclusive Mega Bundle
    megaBundle: { type: MegaBundleSchema, required: true },
  },
  {
    timestamps: true,
    collection: "homepage_settings",
  }
);

const HomePageSetting = mongoose.models.HomePageSetting || mongoose.model("HomePageSetting", HomePageSettingSchema);

export default HomePageSetting;