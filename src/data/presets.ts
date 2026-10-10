import { Campaign } from '../types';

export interface PromptPreset {
  id: string;
  category: string;
  title: string;
  prompt: string;
  industry: string;
  tone: string;
  goal: string;
  audience: string;
  suggestedVisual: string;
}

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'preset-ceramics',
    category: 'Artisan & Craft',
    title: 'Earth & Kiln Studio Collection Drop',
    prompt: 'Exclusive autumn ceramics collection drop handcrafted with raw stoneware and wood-ash glaze. Offer 24-hour private access to subscribers before public release, celebrating slow living and deliberate craft.',
    industry: 'Ceramics & Homeware',
    tone: 'Poetic, Serene, Artisanal',
    goal: 'Private Early-Access Sales',
    audience: 'Design-conscious interior enthusiasts and loyal patrons',
    suggestedVisual: 'Minimalist ceramic vases on unbleached linen pedestal, soft morning sunlight casting gentle diagonal shadows, muted terracotta and sage glazes, 35mm film grain',
  },
  {
    id: 'preset-saas',
    category: 'Technology & SaaS',
    title: 'DueFlow V2: Autonomous Cashflow Stream',
    prompt: 'Major platform launch announcing automated invoice reconciliation and intelligent gentle follow-ups for independent creative studios. Highlight how founders gain 6+ hours weekly without uncomfortable client chasing.',
    industry: 'Financial Software / B2B SaaS',
    tone: 'Confident, Calm, Minimalist',
    goal: 'Trial Signup & Product Upgrade',
    audience: 'Creative agency founders, solo architects, and design consultants',
    suggestedVisual: 'Warm ivory architectural desk with aluminum laptop displaying serene minimal financial dashboard, soft diffused lighting, Swiss modernist design atmosphere',
  },
  {
    id: 'preset-coffee',
    category: 'Culinary & Roastery',
    title: 'Monolith Roasters Single-Origin Micro-Lot',
    prompt: 'Limited seasonal release of anaerobic natural Ethiopian Yirgacheffe beans with notes of wild jasmine and candied bergamot. Educate on high-elevation terroir and brewing rituals.',
    industry: 'Specialty Coffee',
    tone: 'Refined, Sensory, Informative',
    goal: 'E-commerce Pre-Order',
    audience: 'Discerning specialty coffee aficionados and home baristas',
    suggestedVisual: 'Amber glass vessel and minimalist matte black coffee bean pouch on pale limestone counter, delicate steam rising from ceramic cup, serene warm ivory backdrop',
  },
  {
    id: 'preset-retreat',
    category: 'Wellness & Architecture',
    title: 'Solstice Sanctuary Winter Residency',
    prompt: 'Invitation to an intimate winter creative residency in the Kyoto hills, focusing on silent work periods, architectural contemplation, and tea meditation. Limited to 12 participants.',
    industry: 'Hospitality & Retreats',
    tone: 'Meditative, Exclusive, Literary',
    goal: 'Residency Applications',
    audience: 'Authors, designers, and creative directors seeking deep work retreats',
    suggestedVisual: 'Traditional Japanese cedar pavilion with snow dusting the stone courtyard, warm amber lantern glow through shoji screen, peaceful misty pine mountain background',
  },
  {
    id: 'preset-fashion',
    category: 'Apparel & Capsule',
    title: 'Kanso Archive: Unstructured Wool Overcoat',
    prompt: 'Capsule launch of an unlined double-faced Merino wool overcoat crafted in Northern Italy. Emphasize zero-waste pattern cutting, longevity, and timeless architectural silhouette.',
    industry: 'Luxury Minimalist Fashion',
    tone: 'Editorial, High-Fashion, Understated',
    goal: 'Limited Edition Pre-Order',
    audience: 'Collectors of archival garments and quiet luxury aesthetics',
    suggestedVisual: 'Editorial studio portrait of model wearing tailored oat-colored wool coat against warm ivory seamless backdrop, gentle directional Rembrandt lighting, serene high-fashion magazine aesthetic',
  },
];

export const INITIAL_SAMPLE_CAMPAIGN: Campaign = {
  id: 'campaign-earth-kiln-autumn',
  campaignTitle: 'Earth & Kiln — The Autumn Stone Collection',
  campaignTheme: 'Artisanal Serenity & Slow Materiality',
  prompt: 'Exclusive autumn ceramics collection drop handcrafted with raw stoneware and wood-ash glaze. Offer 24-hour private access to subscribers before public release.',
  audienceSummary: 'Patrons of handcrafted homeware and quiet living aesthetics',
  industry: 'Artisanal Ceramics & Design',
  tone: 'Poetic, Serene, Elevated',
  goal: 'Subscriber VIP Early Access',
  subjectLines: [
    {
      text: 'Before the kiln cools: private access to the Autumn Stone collection',
      type: 'Curiosity',
      preheader: '24 hours reserved exclusively for our private ledger patrons.',
      openRateScore: 96,
      rationale: 'Evokes tactile intimacy and privileged early access without aggressive sales jargon.',
    },
    {
      text: 'Thirty-two unique vessels, shaped by fire and quiet hands',
      type: 'Story / Personal',
      preheader: 'Explore the unreleased series from our Kyoto studio.',
      openRateScore: 92,
      rationale: 'Draws focus to small-batch exclusivity and craftsmanship narrative.',
    },
    {
      text: 'Your private key to the Autumn ceramics release',
      type: 'Benefit-driven',
      preheader: 'Doors open 24 hours ahead of public announcement.',
      openRateScore: 89,
      rationale: 'Clear, direct VIP benefit emphasizing timely action.',
    },
    {
      text: 'Autumn in raw stoneware and ash',
      type: 'Editorial Minimal',
      preheader: 'Quiet forms for your autumn table rituals.',
      openRateScore: 94,
      rationale: 'Understated aesthetic confidence that respects the recipient’s inbox.',
    },
    {
      text: 'Private preview: the wood-ash glaze series has arrived',
      type: 'Urgency',
      preheader: 'Each numbered piece is one of one.',
      openRateScore: 91,
      rationale: 'Subtle scarcity reminder highlighting unique numbered pieces.',
    },
  ],
  selectedSubjectIndex: 0,
  headline: 'Vessels shaped by patience, fire, and quiet mornings.',
  subheadline: 'The Autumn Stone Collection is now open to our private circle.',
  bodyMarkdown: `For the past four months, our studio has worked in rhythm with wood, clay, and early mountain light.

Every piece in the **Autumn Stone Series** began as unrefined iron-rich stoneware from the Shigaraki valley. Fired over sixty hours in our wood-burning kiln, the natural ash creates unpredictable textures—ranging from raw charcoal matte to soft olive glass.

Because of the natural firing cycle, no two vessels will ever be identical. Each carries the physical record of the flame that touched it.

### What is included in this drop:
* **The Ritual Pourer** — Designed for tea, pour-over, and mindful kitchen rituals.
* **Low Faceted Bowls** — Hand-carved exterior fluting with a smooth, silk-touch interior.
* **The Monolith Amphora** — Sculptural centerpiece vessel produced in an edition of only eight.

As someone on our private ledger, you have access **24 hours before** the collection is opened to the public tomorrow evening at 6:00 PM EST.`,
  bodyHtml: `<p>For the past four months, our studio has worked in rhythm with wood, clay, and early mountain light.</p>
<p>Every piece in the <strong>Autumn Stone Series</strong> began as unrefined iron-rich stoneware from the Shigaraki valley. Fired over sixty hours in our wood-burning kiln, the natural ash creates unpredictable textures—ranging from raw charcoal matte to soft olive glass.</p>
<p>Because of the natural firing cycle, no two vessels will ever be identical. Each carries the physical record of the flame that touched it.</p>
<h3 style="font-size:18px;margin-top:24px;margin-bottom:12px;letter-spacing:-0.01em;">What is included in this drop:</h3>
<ul style="padding-left:20px;margin-bottom:24px;line-height:1.7;">
  <li><strong>The Ritual Pourer</strong> — Designed for tea, pour-over, and mindful kitchen rituals.</li>
  <li><strong>Low Faceted Bowls</strong> — Hand-carved exterior fluting with a smooth, silk-touch interior.</li>
  <li><strong>The Monolith Amphora</strong> — Sculptural centerpiece vessel produced in an edition of only eight.</li>
</ul>
<p>As someone on our private ledger, you have access <strong>24 hours before</strong> the collection is opened to the public tomorrow evening at 6:00 PM EST.</p>`,
  primaryCta: {
    label: 'Explore Private Preview',
    url: 'https://earthandkiln.example/private-autumn',
    style: 'Deep Midnight Navy with warm ivory typography',
  },
  secondaryCta: {
    label: 'Read Studio Journal Entry',
    url: 'https://earthandkiln.example/journal/firing-42',
  },
  imagePrompt: 'Artisan ceramic vessels and tea pourer displayed on raw unbleached linen fabric, soft natural morning sunlight casting gentle diagonal shadows, muted terracotta, dusty sage and warm ivory palette, 35mm photography aesthetic',
  imageUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=1600&q=85',
  imageSize: '2K',
  aspectRatio: '16:9',
  visualStyleDescriptor: 'Warm ivory canvas, tactile matte ceramics, warm morning raking light, natural linen',
  keyTakeaways: [
    '24-Hour VIP Private access prior to public release',
    'Individually numbered wood-fired stoneware vessels',
    'Complimentary insured worldwide archival packaging',
  ],
  spamScoreAnalysis: {
    score: 8,
    rating: 'Clean',
    tips: [
      'Pristine text-to-link balance with zero hype words',
      'Sender reputation supported by personalized preheader',
      'No spam filter trigger words or aggressive capitalization',
    ],
  },
  sendTimeRecommendation: 'Tuesday or Thursday at 7:45 AM local recipient time',
  abTestRecommendation: 'Subject line A (Curiosity & kiln warmth) vs. Subject line D (Editorial minimalist statement)',
  createdAt: '2026-10-09T09:30:00Z',
  layoutTemplate: 'editorial-minimal',
};
