/**
 * Full player-registration Terms & Conditions for the Ballpark Corporate
 * Cricket League, Season 1. Source of truth is the signed-off copy in
 * `BPCCL_Player_Registration_Terms_&_Conditions.docx` — keep this in sync when
 * that document changes, and bump TERMS_VERSION so the registration gate forces
 * every player to re-accept.
 *
 * Server-safe (no "use client"): rendered inside the client-side registration
 * gate, but has no interactivity of its own.
 */

/** Bump when the terms text below changes, to force re-acceptance. */
export const TERMS_VERSION = "2026-11-27";

type Block = { type: "p"; text: string } | { type: "list"; items: string[] };
type Section = { n: number; title: string; blocks: Block[] };

const TERMS_SECTIONS: Section[] = [
  {
    n: 1,
    title: "Who can register",
    blocks: [
      {
        type: "p",
        text: "BPCCL BallPark Corporate Cricket League, Season 1 (“BPCCL” or “the League”) is for working professionals, including salaried employees, business owners, founders and self-employed professionals.",
      },
      {
        type: "p",
        text: "You must provide your current company or business name, your designation, and a link to your own LinkedIn profile showing that work. Each player may register once per season using one mobile number. Registration closes on 20 December 2026.",
      },
      {
        type: "p",
        text: "All information you provide must be true, complete and your own. If requested, you must provide identification, such as an Aadhaar card, proof of employment or other documents the League reasonably needs.",
      },
    ],
  },
  {
    n: 2,
    title: "Eligibility for non-professional players",
    blocks: [
      {
        type: "p",
        text: "BPCCL is for non-professional cricketers. You are not eligible if, at any time in the 10 years before your registration date, you have played board, state, zonal, district-level or professional cricket.",
      },
      {
        type: "p",
        text: "If your last match at one of these levels was more than 10 years before your registration date, you may register, but you must disclose that history.",
      },
      {
        type: "p",
        text: "For these terms, “board, state, zonal, district-level or professional cricket” includes:",
      },
      {
        type: "list",
        items: [
          "International cricket; IPL or another franchise T20 league.",
          "BCCI or other board domestic competitions, including Ranji Trophy, Vijay Hazare Trophy, Syed Mushtaq Ali Trophy, Duleep Trophy and similar competitions.",
          "State teams at any age group, including U-16, U-19, U-23/25 and senior teams.",
          "Zonal teams or zonal tournaments.",
          "District teams or district association tournaments.",
          "University representation in inter-zonal or All India competitions.",
          "A paid contract with a club, county or association.",
          "Any cricket for which you received a match fee, salary or retainer beyond expenses.",
        ],
      },
      {
        type: "p",
        text: "You must honestly declare whether you have ever played at any of these levels, your highest level and the last year you played. Failing to disclose this information will be treated as a false declaration.",
      },
      {
        type: "p",
        text: "The League may also refuse a player it considers to be a trained or current competitive cricketer. This may include current coaches, academy professionals or players registered with a state association, even if they do not fall within the definition above.",
      },
    ],
  },
  {
    n: 3,
    title: "Background checks",
    blocks: [
      {
        type: "p",
        text: "By registering, you authorize the League to check your identity, age, employment and cricket history.",
      },
      {
        type: "p",
        text: "The League may search public records and websites, including but not limited to ESPNcricinfo, Cricket Archive, BCCI and state association records, league and tournament websites, CricHeroes, LinkedIn, Instagram, news reports and other search engines. It may contact you or other people to verify information it finds.",
      },
      {
        type: "p",
        text: "If a record appears to match you, the League may place your registration on hold and ask you to explain or provide evidence. If you do not respond within the time given, the League may reject your registration.",
      },
    ],
  },
  {
    n: 4,
    title: "Registration, review and selection",
    blocks: [
      {
        type: "p",
        text: "Registering and paying the registration fee does not guarantee that you will be approved, included in the auction pool, bought by a team or selected to play.",
      },
      {
        type: "p",
        text: "The League reviews every registration and may approve, hold or reject it at its sole discretion. Reasons may include a profile that does not show you are a working professional, an unclear photo or document, or a professional cricket record. The League is not required to provide reasons.",
      },
      {
        type: "p",
        text: "The League assigns approved players to auction categories. Its category decision is final.",
      },
    ],
  },
  {
    n: 5,
    title: "Player photo",
    blocks: [
      {
        type: "p",
        text: "You must upload a clear, recent photo of your own face. You must be looking at the camera and photographed in good light. The photo must not include sunglasses, caps, helmets, masks, filters, logos or other people.",
      },
      {
        type: "p",
        text: "The League may use your photo on the auction screen, your player card and League media. The League may reject a registration if the photo does not meet these requirements or ask you to submit a replacement.",
      },
    ],
  },
  {
    n: 6,
    title: "The auction",
    blocks: [
      {
        type: "p",
        text: "Franchise owners select players at a live auction conducted by the League under its auction rules.",
      },
      {
        type: "p",
        text: "If a team buys you, you will play for that team for the season and may not refuse the team after the auction. If you are not sold, teams may be offered the opportunity to select you later under the auction rules, or you may not play that season.",
      },
      {
        type: "p",
        text: "You must not request or accept money or favours from a team or owner in connection with the auction. You must report any such offer to the League.",
      },
    ],
  },
  {
    n: 7,
    title: "Fees and refunds",
    blocks: [
      {
        type: "p",
        text: "Registration fee: ₹500. You must pay this when you register. It covers the review of your registration and the running of the auction pool.",
      },
      {
        type: "p",
        text: "Restricted professions: To support fair competition and a level playing field, advocates and other legal professionals, real estate agents and property dealers, and business owners and founders (including sole proprietors and partners) may register only on the recommendation of a franchise owner and with approval from the League. The League’s decision is final. You must declare if you belong to one of these groups.",
      },
      {
        type: "p",
        text: "The registration fee is non-refundable in all circumstances. No refund will be given if your registration is rejected or held, you are not bought at auction, you withdraw, you are removed under these terms, or a declaration you made is false or incomplete.",
      },
      {
        type: "p",
        text: "Auction fee: ₹3,000. If a team buys you at auction, you must pay this additional fee by the deadline set by the League. It covers your kit and match-day costs and is non-refundable. No refund will be given if you withdraw, are injured or unwell, are not selected in a playing XIII, play few or no matches, are suspended or removed, your team withdraws, or matches are shortened, moved or abandoned.",
      },
      {
        type: "p",
        text: "If the League cancels the entire season before the first match, it may choose either to refund the auction fee or carry it over to the next season. The registration fee will not be refunded.",
      },
      {
        type: "p",
        text: "If you do not pay the auction fee by the deadline, the League may remove you from your team’s squad so the team can replace you.",
      },
      {
        type: "p",
        text: "You must pay from an account you are entitled to use and provide the correct payment reference. A payment that is reversed, charged back or cannot be matched means your registration is incomplete.",
      },
      {
        type: "p",
        text: "Your kit is made to order and cannot be returned or exchanged.",
      },
    ],
  },
  {
    n: 8,
    title: "No paid players",
    blocks: [
      {
        type: "p",
        text: "You must not accept or agree to accept money or any other benefit from a team, owner or anyone acting on their behalf in exchange for playing in BPCCL.",
      },
      {
        type: "p",
        text: "If the League finds that this declaration is untrue, or that you are being paid to play, you may be barred from further BPCCL matches without a refund. The League will hear your side before making its decision. Your team may also lose the matches concerned.",
      },
    ],
  },
  {
    n: 9,
    title: "Conduct at matches and events",
    blocks: [
      {
        type: "p",
        text: "You must follow the League’s playing conditions, code of conduct and the decisions of umpires, match referees and League officials. These rules form part of these terms. The League will share them before the season and may update them.",
      },
      { type: "p", text: "You must:" },
      {
        type: "list",
        items: [
          "Change only in the designated changing area, never in open areas.",
          "Not smoke, vape or use tobacco anywhere at the venue.",
          "Not consume alcohol or intoxicants on match days, and never play under their influence.",
          "Wear your full team kit on the field and in the team area.",
          "Treat players, officials, organisers, staff and spectators respectfully. Abuse, threats, violence and remarks about a person’s religion, caste, gender, region or background are prohibited.",
          "Look after the ground, facilities and equipment. You are responsible for damage you cause.",
          "Not post abusive or false statements online about the League, its officials, teams, players or sponsors.",
        ],
      },
    ],
  },
  {
    n: 10,
    title: "Penalties",
    blocks: [
      {
        type: "p",
        text: "Breaking these terms or the League’s rules may result in a warning, a fine under the League’s fines schedule, suspension for one or more matches, or removal from the League. Removal does not entitle you to a refund.",
      },
      {
        type: "p",
        text: "The League may charge fines to you or your team. Fines must be paid before you can play again.",
      },
      {
        type: "p",
        text: "Before imposing a serious penalty, the League will hear your side. You may appeal once to the League’s governing council. Its decision is final.",
      },
    ],
  },
  {
    n: 11,
    title: "Fair play and truthful declarations",
    blocks: [
      {
        type: "p",
        text: "You must not bet on a BPCCL match, fix or attempt to fix any part of a match, or share inside information with anyone who bets. You must report any approach of this kind to the League immediately.",
      },
      {
        type: "p",
        text: "Taking part in betting or fixing may result in a lifetime ban. The League may also report the matter to the police.",
      },
      {
        type: "p",
        text: "Playing under a false name or age, or allowing someone else to play in your place, will result in removal without a refund. Your team may also lose the matches concerned.",
      },
      {
        type: "p",
        text: "A false or incomplete declaration—including concealing professional cricket played within the last 10 years or providing false employment details—may result in rejection or removal without a refund at any time during the season, a ban from future seasons, and your team losing matches you played.",
      },
    ],
  },
  {
    n: 12,
    title: "Health and safety",
    blocks: [
      {
        type: "p",
        text: "Cricket carries a risk of injury. You take part voluntarily and at your own risk, and confirm that you are fit to play.",
      },
      {
        type: "p",
        text: "You must tell the League about any medical condition it should know about. You agree to receive first aid and emergency medical treatment if needed.",
      },
      {
        type: "p",
        text: "To the extent permitted by law, the League, team owners, venue and sponsors are not liable for injury, illness, or loss of or damage to your belongings, unless caused by their gross negligence.",
      },
    ],
  },
  {
    n: 13,
    title: "Photos, video and your name",
    blocks: [
      {
        type: "p",
        text: "Matches, the auction and League events may be filmed, streamed and photographed.",
      },
      {
        type: "p",
        text: "You allow the League to use your name, photo, image, voice and statistics in broadcasts, highlights, the ball library, its website and social media, promotions, and sponsor activities linked to the League, without payment, during and after the season.",
      },
      {
        type: "p",
        text: "The League will not use you to endorse a particular product without your separate consent. The League owns the footage, photos and statistics it records.",
      },
    ],
  },
  {
    n: 14,
    title: "Personal data",
    blocks: [
      {
        type: "p",
        text: "The League collects your name, mobile number, email, date of birth, photo, Aadhaar card, company and designation, CricHeroes, LinkedIn and Instagram links, cricket background declaration, payment reference and receipt, playing role, kit and jersey details.",
      },
      {
        type: "p",
        text: "The League uses this information, and information found through background checks, to:",
      },
      {
        type: "list",
        items: [
          "Verify your eligibility.",
          "Run registration, the auction, teams, fixtures and kit.",
          "Send messages about the League.",
        ],
      },
      {
        type: "p",
        text: "League admins can see your registration. Your team owner will receive your squad details and mobile number; the kit maker will receive your kit details.",
      },
      {
        type: "p",
        text: "Public pages may show your name, photo, playing role, category, auction price and cricket statistics. Your mobile number, email, date of birth and Aadhaar card will not be shown publicly. Your Aadhaar card is kept in private storage accessible only to League admins.",
      },
      {
        type: "p",
        text: "The League’s website uses Google Analytics and the Meta Pixel (Facebook and Instagram), which use cookies to count visits and identify which ads and links bring visitors to the website. These services do not receive your name, mobile number, email or documents.",
      },
      {
        type: "p",
        text: "If you start but do not finish registering, the League keeps the name, mobile number and email you entered, how far you got, and which ad or link brought you to the website, so it can contact you about completing registration.",
      },
      {
        type: "p",
        text: "The League keeps your data only for as long as needed to run the League and meet legal requirements. You may ask the League to show, correct or delete your data, or withdraw your consent. Without some of this data, you may not be able to take part.",
      },
      {
        type: "p",
        text: "The League handles your data in line with India’s Digital Personal Data Protection Act, 2023.",
      },
    ],
  },
  {
    n: 15,
    title: "Changes and events outside the League’s control",
    blocks: [
      {
        type: "p",
        text: "The League may change fixtures, venues, timings, the format or its rules, and will inform players in good time.",
      },
      {
        type: "p",
        text: "The League is not responsible for delays or cancellations caused by weather, government orders, venue problems or other events outside its control.",
      },
      {
        type: "p",
        text: "The League may update these terms. The version and date shown at the top determine which terms apply. Registered players will be told about important changes.",
      },
    ],
  },
  {
    n: 16,
    title: "Disputes and governing law",
    blocks: [
      {
        type: "p",
        text: "On questions about these terms, the rules or the season, the League’s decision is final, subject to the appeal described under Penalties.",
      },
      {
        type: "p",
        text: "These terms are governed by the laws of India. The courts at Gurugram, Haryana have jurisdiction over disputes.",
      },
    ],
  },
  {
    n: 17,
    title: "Contact",
    blocks: [
      {
        type: "p",
        text: "For questions about registration, personal data or these terms, contact:",
      },
      {
        type: "list",
        items: [
          "Ashish Kapur — 8800553510 — ashish@bpccl.in",
          "Ayush Soni — 9810595262 — Ayush@bpccl.in",
          "Website: www.bpccl.in",
        ],
      },
    ],
  },
];

/** Formatted, read-only render of the full registration terms. */
export function RegistrationTermsBody() {
  return (
    <div className="flex flex-col gap-6">
      {TERMS_SECTIONS.map((section) => (
        <section key={section.n} className="flex flex-col gap-2.5">
          <h4 className="font-display text-base font-bold text-navy-900">
            {section.n}. {section.title}
          </h4>
          {section.blocks.map((block, i) =>
            block.type === "p" ? (
              <p key={i} className="text-sm leading-relaxed text-ink-900">
                {block.text}
              </p>
            ) : (
              <ul key={i} className="flex flex-col gap-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink-900">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </div>
  );
}
