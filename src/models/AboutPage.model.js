import mongoose from "mongoose";
const { Schema, model, models } = mongoose;

/* ------------ HERO SECTION ------------ */
const heroSchema = new Schema({
  title: { type: String, required: true },       // "About Kumar"
  subtitle: { type: String, required: true },    // small text line
});

/* ------------ JOURNEY SECTION ------------ */
const journeySchema = new Schema({
  title: { type: String, required: true },       // "The Journey"
  description: [{ type: String, required: true }] // multiple paragraphs
});

/* ------------ STATS SECTION ------------ */
const statSchema = new Schema({
  icon: { type: String, required: true },        // lucide/react icon name
  value: { type: String, required: true },       // "100+", "50K+"
  label: { type: String, required: true },       // "Tracks Released"
  isActive: { type: Boolean, default: true }
});

/* ------------ PHILOSOPHY CARDS ------------ */
const philosophySchema = new Schema({
  title: { type: String, required: true },       // "Quality First"
  description: { type: String, required: true }, // paragraph
  accentColor: { type: String, default: "#000" }, // optional color per card
  isActive: { type: Boolean, default: true }
});

/* ------------ MAIN ABOUT PAGE SCHEMA ------------ */
const aboutPageSchema = new Schema(
  {
    hero: heroSchema,

    journey: journeySchema,

    stats: {
      type: [statSchema],
      default: []
    },

    philosophy: {
      type: [philosophySchema],
      default: []
    }
  },
  { timestamps: true }
);

const AboutPage = models.AboutPage || model("AboutPage", aboutPageSchema);
export default AboutPage;
