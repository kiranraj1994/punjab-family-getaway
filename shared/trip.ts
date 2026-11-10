/**
 * Single source of truth for the trip and its survey.
 * The survey UI, the admin analytics and (in Phase 2) server-side validation all read from here,
 * so a future trip is a new config object rather than new screens.
 */

export type SceneKind =
  | "temple"
  | "border"
  | "heritage"
  | "bazaar"
  | "fields"
  | "tractor"
  | "garden"
  | "village"
  | "lake"
  | "food"
  | "birds";

export interface Option {
  id: string;
  label: string;
  hint?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  scene: SceneKind;
  /** Small hue shift so neighbouring placeholder illustrations do not look identical. */
  tone?: number;
  note?: string;
}

export type CategoryKey =
  | "amritsar_activities"
  | "exhibitions_and_shopping"
  | "gardens_and_nature"
  | "farm_and_village_activities"
  | "chandigarh_activities";

export interface ActivityCategory {
  key: CategoryKey;
  title: string;
  shortTitle: string;
  eyebrow: string;
  intro: string;
  notice?: string;
  activities: Activity[];
}

export const TRIP = {
  id: "punjab-2026",
  name: "Punjab Family Getaway 2026",
  subtitle: "Four days of family, culture, food and unforgettable experiences.",
  intro:
    "We're planning a family road trip to Punjab! Help us choose the experiences, accommodation and activities everyone would enjoy.",
  dates: "3–6 December 2026",
  destination: "Amritsar, Punjab",
  optionalDestination: "Chandigarh",
  start: "Ashram, New Delhi",
  duration: "4 days / 3 nights",
  travellers: "11 Adults + 1 Little Traveller",
  vehicles: "3 Cars",
  vehicleDetail: "2 Tata Altroz and 1 Hyundai i20",
  nights: "3 Nights",
  rooms: "4 rooms or one entire villa",
  routeVia: "Delhi–Amritsar–Katra Expressway (NE-5)",
  routeDistance: "~450 km",
  routeDuration: "~7 hrs drive",
} as const;

export const DATE_OPTIONS: Option[] = [
  { id: "all-four-days", label: "Yes – all four days", hint: "3–6 December" },
  { id: "prefer-4-6", label: "Prefer 4–6 December" },
  { id: "prefer-3-5", label: "Prefer 3–5 December" },
  { id: "not-sure", label: "Not sure yet" },
  { id: "cannot-join", label: "Cannot join" },
];

export const ACCOMMODATION_TYPES: Option[] = [
  { id: "hotel", label: "Hotel – 4 rooms", hint: "Separate rooms, daily housekeeping" },
  { id: "villa", label: "Airbnb / Entire villa", hint: "Everyone together under one roof" },
  { id: "homestay", label: "Homestay / Serviced apartment", hint: "Homely, with a host or kitchen" },
  { id: "any", label: "Any comfortable option" },
];

export const ACCOMMODATION_BUDGETS: Option[] = [
  { id: "below-3000", label: "Below ₹3,000" },
  { id: "3000-4000", label: "₹3,000–₹4,000" },
  { id: "4000-5000", label: "₹4,000–₹5,000" },
  { id: "5000-6000", label: "₹5,000–₹6,000" },
  { id: "flexible", label: "Flexible for a good property" },
];

export const FACILITIES: Option[] = [
  { id: "breakfast", label: "Breakfast included" },
  { id: "parking", label: "Parking for 3 cars" },
  { id: "four-rooms", label: "At least 4 rooms" },
  { id: "common-area", label: "Common living / dining area" },
  { id: "kitchen", label: "Kitchen access" },
  { id: "heating", label: "Heating and hot water" },
  { id: "child-friendly", label: "Child-friendly property" },
  { id: "location", label: "Convenient location" },
  { id: "cleanliness", label: "Good cleanliness and reviews" },
  { id: "lift", label: "Lift access" },
];

export const CHANDIGARH_OPTIONS: Option[] = [
  { id: "yes-definitely", label: "Yes, definitely" },
  { id: "yes-if-fits", label: "Yes, if it fits comfortably" },
  { id: "only-if-event", label: "Only if a special event / flower show is happening" },
  { id: "no-amritsar", label: "No, prefer more time in Amritsar" },
];

export const PACE_OPTIONS: Option[] = [
  { id: "relaxed", label: "Relaxed", hint: "Late starts, long meals, one or two highlights a day" },
  { id: "balanced", label: "Balanced", hint: "A good mix of sightseeing and downtime" },
  { id: "packed", label: "Packed itinerary", hint: "See as much as we possibly can" },
];

export const ACTIVITY_BUDGETS: Option[] = [
  { id: "below-500", label: "Below ₹500" },
  { id: "500-1000", label: "₹500–₹1,000" },
  { id: "1000-2000", label: "₹1,000–₹2,000" },
  { id: "2000-3000", label: "₹2,000–₹3,000" },
  { id: "flexible", label: "Flexible" },
];

export const PLATFORMS: Option[] = [
  { id: "booking", label: "Booking.com" },
  { id: "airbnb", label: "Airbnb" },
  { id: "makemytrip", label: "MakeMyTrip" },
  { id: "direct", label: "Direct" },
  { id: "other", label: "Other" },
];

export const YES_NO_UNSURE: Option[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "unsure", label: "Not sure" },
];

export const CATEGORIES: ActivityCategory[] = [
  {
    key: "amritsar_activities",
    title: "Amritsar's spiritual and historical heart",
    shortTitle: "Amritsar attractions",
    eyebrow: "Amritsar",
    intro: "Tap every place you would like to visit. Choose as many as you like.",
    activities: [
      { id: "golden-temple-evening", title: "Golden Temple – evening visit", description: "The shrine glowing over the sarovar after dark, and the Palki Sahib ceremony.", scene: "temple" },
      { id: "golden-temple-morning", title: "Golden Temple – early morning visit", description: "Quiet dawn darshan, morning kirtan and langar before the crowds arrive.", scene: "temple", tone: 150 },
      { id: "wagah-border", title: "Wagah Border Beating Retreat Ceremony", description: "The high-energy flag-lowering parade at the Attari–Wagah border, about an hour from the city.", scene: "border" },
      { id: "jallianwala-bagh", title: "Jallianwala Bagh", description: "The memorial garden of 1919, a short walk from the Golden Temple.", scene: "garden", tone: -30 },
      { id: "partition-museum", title: "Partition Museum", description: "Personal stories, letters and artefacts of 1947, inside the restored Town Hall.", scene: "heritage" },
      { id: "durgiana-temple", title: "Durgiana Temple", description: "A serene temple set in a sacred lake, known for its silver doors.", scene: "temple", tone: -25 },
      { id: "gobindgarh-fort", title: "Gobindgarh Fort", description: "Maharaja Ranjit Singh's fort, now with museums, live shows and food stalls.", scene: "heritage", tone: 20 },
    ],
  },
  {
    key: "exhibitions_and_shopping",
    title: "Exhibitions, shopping and food",
    shortTitle: "Exhibitions & shopping",
    eyebrow: "Bazaars & flavours",
    intro: "Markets, trade fairs and the food Amritsar is famous for.",
    notice: "Event venues and schedules for 2026 are not final. We will reconfirm dates before adding any exhibition to the plan.",
    activities: [
      { id: "pitex", title: "PITEX 2026", description: "The Punjab International Trade Expo – a large shopping and lifestyle fair.", scene: "bazaar", note: "Dates to be reconfirmed" },
      { id: "gandhi-shilp-bazaar", title: "Gandhi Shilp Bazaar", description: "Handloom and handicraft stalls from artisans across India.", scene: "bazaar", tone: 40, note: "Schedule to be reconfirmed" },
      { id: "hall-bazaar", title: "Hall Bazaar", description: "The old-city market for juttis, phulkari, dry fruits and souvenirs.", scene: "bazaar", tone: -20 },
      { id: "katra-jaimal-singh", title: "Katra Jaimal Singh", description: "Amritsar's best-known lanes for fabrics, suits and wedding shopping.", scene: "heritage", tone: -15 },
      { id: "food-experience", title: "Punjabi food and street-food experience", description: "Kulchas, lassi, chole, tikkas and jalebi at the city's legendary eateries.", scene: "food" },
    ],
  },
  {
    key: "gardens_and_nature",
    title: "Gardens, nature and countryside",
    shortTitle: "Gardens & nature",
    eyebrow: "Outdoors",
    intro: "Slower moments: winter gardens, flowers and the open Punjab countryside.",
    notice: "Early December is usually too soon for fully yellow mustard fields. Expect green winter crops and lovely rural scenery; blooms would be a bonus, not a promise.",
    activities: [
      { id: "rose-garden-amritsar", title: "Rose Garden, Amritsar", description: "A relaxed stroll among winter roses and lawns.", scene: "garden" },
      { id: "ram-bagh", title: "Ram Bagh Garden / Company Bagh", description: "Historic gardens around Maharaja Ranjit Singh's summer palace.", scene: "garden", tone: 30 },
      { id: "botanical-garden", title: "Botanical Garden", description: "A quiet green campus collection of trees and plants.", scene: "garden", tone: 60, note: "Subject to visitor access" },
      { id: "flower-photography", title: "Flower photography experience", description: "An unhurried morning photographing seasonal flowers and family portraits.", scene: "garden", tone: -40 },
      { id: "countryside-drive", title: "Winter countryside drive", description: "A scenic drive through villages, canals and misty winter fields.", scene: "fields" },
      { id: "mustard-fields", title: "Mustard fields / agricultural scenery", description: "Stop among the winter crops for photos and fresh air.", scene: "fields", tone: 25, note: "Yellow blooms not guaranteed" },
      { id: "orchard-visit", title: "Orchard visit", description: "Walk through a kinnow or guava orchard and taste fruit off the tree.", scene: "fields", tone: -35 },
    ],
  },
  {
    key: "farm_and_village_activities",
    title: "Punjabi farm and village experience",
    shortTitle: "Farm & village",
    eyebrow: "Pind life",
    intro: "A day in rural Punjab: fields, animals, home cooking and folk culture.",
    activities: [
      { id: "farm-visit", title: "Punjabi farm visit", description: "Spend time with a farming family and see how the land is worked.", scene: "fields", tone: 10 },
      { id: "tractor-ride", title: "Tractor ride", description: "A bumpy, cheerful ride through the fields – a favourite with children.", scene: "tractor" },
      { id: "bullock-cart", title: "Bullock cart ride", description: "The slow, traditional way to cross the village.", scene: "village", tone: 20 },
      { id: "dairy-farm", title: "Animal feeding / dairy farm visit", description: "Feed the cows and buffaloes and watch fresh milk being churned.", scene: "village", tone: -20 },
      { id: "punjabi-cooking", title: "Traditional Punjabi cooking", description: "Make makki di roti and sarson da saag on a chulha with the hosts.", scene: "food", tone: 20 },
      { id: "farm-lunch", title: "Farm-to-table lunch", description: "A long, home-cooked lunch outdoors with fresh white butter and lassi.", scene: "food", tone: -20 },
      { id: "sadda-pind", title: "Sadda Pind cultural village", description: "A recreated Punjabi village with crafts, games, shows and food.", scene: "village" },
      { id: "folk-dance", title: "Folk dance and cultural performances", description: "Bhangra, giddha and dhol – and a chance to join in.", scene: "village", tone: 45 },
    ],
  },
  {
    key: "chandigarh_activities",
    title: "Chandigarh – an optional stop",
    shortTitle: "Chandigarh",
    eyebrow: "Optional detour",
    intro: "Chandigarh is roughly four to five hours from Amritsar. Pick what would make the detour worthwhile for you.",
    activities: [
      { id: "rock-garden", title: "Rock Garden", description: "Nek Chand's maze of sculptures made from recycled materials.", scene: "heritage", tone: 60 },
      { id: "sukhna-lake", title: "Sukhna Lake / boating", description: "Pedal boats and a promenade walk below the Shivalik hills.", scene: "lake" },
      { id: "bird-park", title: "Chandigarh Bird Park", description: "Walk-through aviaries with colourful exotic birds.", scene: "birds" },
      { id: "garden-of-silence", title: "Garden of Silence", description: "A peaceful meditation garden with a large Buddha statue by the lake.", scene: "lake", tone: 40 },
      { id: "zakir-rose-garden", title: "Zakir Hussain Rose Garden", description: "One of Asia's largest rose gardens, lovely in winter.", scene: "garden", tone: 15 },
      { id: "chrysanthemum-show", title: "Chrysanthemum Show", description: "The city's annual display of hundreds of chrysanthemum varieties.", scene: "garden", tone: -55, note: "Only if dates are confirmed" },
      { id: "chandigarh-sightseeing", title: "Chandigarh city sightseeing", description: "Le Corbusier's planned city, Sector 17 plaza and leafy boulevards.", scene: "heritage", tone: 100 },
    ],
  },
];

export const ALL_ACTIVITIES: Activity[] = CATEGORIES.flatMap((c) => c.activities);
const ACTIVITY_BY_ID = new Map(ALL_ACTIVITIES.map((a) => [a.id, a]));

export function activityTitle(id: string): string {
  return ACTIVITY_BY_ID.get(id)?.title ?? id;
}

export function labelOf(options: Option[], id: string | undefined | null): string {
  if (!id) return "";
  return options.find((o) => o.id === id)?.label ?? id;
}

export interface PropertySuggestion {
  name: string;
  link: string;
  platform: string;
  total_price: string;
  rating: string;
  review_count: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  breakfast: string;
  free_cancellation: string;
  comments: string;
}

export const EMPTY_PROPERTY: PropertySuggestion = {
  name: "", link: "", platform: "", total_price: "", rating: "", review_count: "",
  bedrooms: "", bathrooms: "", parking: "", breakfast: "", free_cancellation: "", comments: "",
};

export const MAX_PROPERTIES = 3;
export const PRIORITY_COUNT = 3;

/** One survey answer set. Field names match the database columns planned for Phase 2. */
export interface SurveyAnswers {
  respondent_name: string;
  contact_number: string;
  date_confirmation: string;
  accommodation_type: string;
  accommodation_budget: string;
  accommodation_facilities: string[];
  additional_accommodation_requirements: string;
  amritsar_activities: string[];
  exhibitions_and_shopping: string[];
  gardens_and_nature: string[];
  farm_and_village_activities: string[];
  chandigarh_activities: string[];
  chandigarh_preference: string;
  trip_pace: string;
  activity_budget: string;
  top_three_priorities: string[];
  additional_suggestions: string;
  child_family_requirements: string;
  property_suggestions: PropertySuggestion[];
}

export const EMPTY_ANSWERS: SurveyAnswers = {
  respondent_name: "", contact_number: "", date_confirmation: "",
  accommodation_type: "", accommodation_budget: "", accommodation_facilities: [],
  additional_accommodation_requirements: "",
  amritsar_activities: [], exhibitions_and_shopping: [], gardens_and_nature: [],
  farm_and_village_activities: [], chandigarh_activities: [], chandigarh_preference: "",
  trip_pace: "", activity_budget: "", top_three_priorities: [],
  additional_suggestions: "", child_family_requirements: "", property_suggestions: [],
};

export interface SurveyResponse extends SurveyAnswers {
  submission_id: string;
  created_at: string;
  updated_at: string;
}
