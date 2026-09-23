<?php

namespace Database\Seeders;

use App\Models\JobListing;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * 150 unique, detailed Star Trek-themed postings across five factions.
 * Not auto-run by DatabaseSeeder — invoke directly:
 *   php artisan db:seed --class=StarTrekJobsSeeder
 */
class StarTrekJobsSeeder extends Seeder
{
    public function run(): void
    {
        $jobs = [
            ...$this->expand(
                company: 'Starfleet / United Federation of Planets',
                urlHost: 'careers.starfleetcommand.ufp.gov',
                requirement: 'Requires a Starfleet Academy commission or equivalent field commendation, Federation Standard fluency, and current security clearance appropriate to the posting.',
                locations: $this->starfleetLocations(),
                roles: $this->starfleetRoles(),
            ),
            ...$this->expand(
                company: 'Klingon Defense Force',
                urlHost: 'qonos.empire.kli',
                requirement: 'A record of honorable combat, fluency in tlhIngan Hol, and House sponsorship are required; cowardice is grounds for immediate discommendation.',
                locations: $this->klingonLocations(),
                roles: $this->klingonRoles(),
            ),
            ...$this->expand(
                company: 'Ferengi Alliance',
                urlHost: 'ferenginar.fca.ferengi',
                requirement: 'Applicants must recite the first ten Rules of Acquisition from memory and post a latinum bond; lobes must be sufficiently large.',
                locations: $this->ferengiLocations(),
                roles: $this->ferengiRoles(),
            ),
            ...$this->expand(
                company: 'Cardassian Union',
                urlHost: 'cardassia.union.gov',
                requirement: 'Requires Central Command vetting, unquestioning loyalty to the Union, and (where applicable) Obsidian Order background clearance.',
                locations: $this->cardassianLocations(),
                roles: $this->cardassianRoles(),
            ),
            ...$this->expand(
                company: 'Romulan Star Empire',
                urlHost: 'romulus.starempire.gov',
                requirement: 'Requires Praetorian loyalty screening and, for cloaked-vessel postings, Tal Shiar clearance; discretion is not optional.',
                locations: $this->romulanLocations(),
                roles: $this->romulanRoles(),
            ),
        ];

        foreach ($jobs as $job) {
            JobListing::updateOrCreate(
                ['external_id' => $job['external_id']],
                $job,
            );
        }
    }

    /**
     * Cycle $roles across every entry in $locations so each row's title
     * (role + location) and description (blurb + location + requirement)
     * are unique, even where the role repeats on a different posting.
     *
     * @param  array<int, string>  $locations
     * @param  array<int, array{title: string, blurb: string}>  $roles
     * @return array<int, array{external_id: string, title: string, company: string, location: string, job_url: string, description: string}>
     */
    private function expand(string $company, string $urlHost, string $requirement, array $locations, array $roles): array
    {
        $jobs = [];

        foreach ($locations as $i => $location) {
            $role = $roles[$i % count($roles)];
            $title = "{$role['title']} — {$location}";
            $slug = Str::slug("{$company}-{$role['title']}-{$location}");

            $jobs[] = [
                'external_id' => Str::limit($slug, 190, ''),
                'title' => $title,
                'company' => $company,
                'location' => $location,
                'job_url' => "https://{$urlHost}/postings/{$slug}",
                'description' => "{$role['blurb']} Posting: {$location}. {$requirement}",
            ];
        }

        return $jobs;
    }

    /** @return array<int, string> */
    private function starfleetLocations(): array
    {
        return [
            'USS Enterprise NCC-1701', 'USS Enterprise NCC-1701-A', 'USS Enterprise NCC-1701-B',
            'USS Enterprise NCC-1701-C', 'USS Enterprise NCC-1701-D', 'USS Enterprise NCC-1701-E',
            'USS Enterprise NCC-1701-F', 'USS Voyager NCC-74656', 'USS Defiant NX-74205',
            'USS Discovery NCC-1031', 'USS Cerritos NCC-75567', 'USS Titan NCC-80102',
            'USS Excelsior NCC-2000', 'USS Reliant NCC-1864', 'USS Stargazer NCC-2893',
            'USS Sutherland NCC-72015', 'USS Yamato NCC-71807', 'USS Saratoga NCC-31911',
            'USS Melbourne NCC-62043', 'USS Hood NCC-42296', 'USS Lakota NCC-42768',
            'USS Prometheus NX-59650', 'USS Equinox NCC-72381', 'USS Relativity NCX-74130',
            'USS Franklin NX-326', 'USS Shenzhou NCC-1227', 'USS Enterprise NX-01',
            'USS Kelvin NCC-0514', 'USS Vengeance NCC-1817-B', 'USS Cayuga NCC-1206',
            'USS Grissom NCC-638', 'USS Pasteur NCC-58925', 'USS Bozeman NCC-1941',
            'USS Odyssey NCC-71832', 'USS Farragut NCC-60597', 'USS Rhode Island NCC-98421',
            'USS Cygnus NCC-2857', 'USS Wells NCC-82385', 'USS Archer NCC-21261',
            'USS Crazy Horse NCC-50446', 'USS Concord NCC-31681', 'USS Zheng He NCC-90410',
            'USS Sacajawea NCC-1974', 'USS Al-Batani NCC-42995', "USS T'Kumbra NCC-63639",
            'USS Nautilus NCC-71735', 'USS Tripoli NCC-19386', 'USS Roosevelt NCC-2573',
            'USS Trieste NCC-37124', 'USS Nog NCC-99812', 'Deep Space 9', 'Deep Space 5',
            'Deep Space 12', 'Starbase 1', 'Starbase 11', 'Starbase 24', 'Starbase 80',
            'Starbase 364', 'Starbase 375', 'Utopia Planitia Fleet Yards, Mars',
        ];
    }

    /** @return array<int, array{title: string, blurb: string}> */
    private function starfleetRoles(): array
    {
        return [
            ['title' => 'Commanding Officer', 'blurb' => 'Holds ultimate authority and responsibility for the vessel or installation, its crew, and mission success; sets course, engages or withdraws from hostile contact, and answers directly to Starfleet Command.'],
            ['title' => 'First Officer', 'blurb' => 'Serves as executive officer, manages department heads and daily operations, and assumes command in the absence or incapacitation of the CO.'],
            ['title' => 'Chief Engineer', 'blurb' => 'Owns warp core stability, structural integrity, and every subsystem from EPS conduits to deflector arrays; leads damage-control parties during combat and refit.'],
            ['title' => 'Chief Science Officer', 'blurb' => 'Directs the science division, analyzes stellar phenomena and first-contact scenarios, and advises the CO on anomalies, sensor readings, and away-mission risk.'],
            ['title' => 'Chief Medical Officer', 'blurb' => 'Runs sickbay, certifies crew fitness for duty, and holds authority to relieve a commanding officer on medical grounds under General Order 104.'],
            ['title' => 'Chief of Security', 'blurb' => 'Commands tactical and security divisions, maintains shipboard order, coordinates boarding-party defense, and manages weapons and shield systems in combat.'],
            ['title' => 'Operations Manager', 'blurb' => 'Coordinates transporter, computer core, and logistics operations, keeping cargo, crew scheduling, and resource allocation running across every shift.'],
            ['title' => 'Helmsman', 'blurb' => 'Pilots the vessel through impulse and warp maneuvers, executes evasive patterns under fire, and plots precision courses through hazardous space.'],
            ['title' => 'Communications Officer', 'blurb' => 'Maintains subspace comm arrays, manages universal translator matrices, and relays hails, distress calls, and encrypted Starfleet traffic.'],
            ['title' => "Ship's Counselor", 'blurb' => 'Provides psychological support to crew under prolonged deployment stress and advises command on the mental fitness of personnel and away-team candidates.'],
            ['title' => 'Quartermaster', 'blurb' => 'Manages replicator rations, uniform and equipment stores, and shuttlebay inventory across long-duration deep-space assignments.'],
            ['title' => 'Transporter Chief', 'blurb' => 'Operates transporter room pattern buffers, calibrates against ionic interference, and executes emergency beam-outs under combat conditions.'],
            ['title' => 'Diplomatic Attaché', 'blurb' => 'Represents Federation interests during first-contact and treaty negotiations, briefing command on protocol for non-Federation species.'],
            ['title' => 'Cadet, Command Track', 'blurb' => 'Rotates through bridge, engineering, and away-team duties under supervision as the final phase of Starfleet Academy training before commissioning.'],
            ['title' => 'Chief Petty Officer', 'blurb' => 'Supervises enlisted crew across maintenance, food service, and general ship\'s-company duties, and is the senior non-commissioned link between crew and officers.'],
        ];
    }

    /** @return array<int, string> */
    private function klingonLocations(): array
    {
        return [
            'IKS Rotarran', 'IKS Pagh', 'IKS Somraw', "IKS Ning'tao", 'IKS Bortas',
            'IKS Kronos One', 'IKS Kahless', 'IKS Amar', "IKS T'Ong", 'IKS Buruk',
            "IKS Hegh'ta", "IKS Kri'stak", "IKS Negh'Var", 'IKS Qevin', "IKS Vor'nak",
            "First City Palace, Qo'noS", "Ty'Gokor Fleet Yards", 'Boreth Monastery',
            'Rura Penthe Penal Colony', 'Praxis Mining Facility', 'Khitomer Outpost',
            'Ketha Lowlands Garrison', 'Great Hall of the High Council', 'San-Tarah Front Base',
            'Narendra III Garrison',
        ];
    }

    /** @return array<int, array{title: string, blurb: string}> */
    private function klingonRoles(): array
    {
        return [
            ['title' => "Ship's Captain", 'blurb' => 'Commands the vessel in battle and glory alike, leads boarding actions personally, and bears sole responsibility for the honor of crew and House.'],
            ['title' => 'Weapons Officer', 'blurb' => 'Mans disruptor banks and photon torpedo tubes, calibrates cloak-to-fire timing, and is first blamed — and first rewarded — for the outcome of every engagement.'],
            ['title' => "Chancellor's Guard", 'blurb' => 'Stands personal watch over the Chancellor and the Great Hall, armed with bat\'leth and disruptor, sworn to die before dishonor reaches the throne.'],
            ['title' => "Bat'leth Combat Instructor", 'blurb' => 'Drills warriors in bat\'leth, mek\'leth, and d\'k tahg forms, and settles disputed rank challenges under formal combat ritual.'],
            ['title' => 'Chief Engineer', 'blurb' => 'Keeps disruptor coils, cloaking generators, and battle-worn propulsion running on discipline and improvisation rather than Federation comfort.'],
            ['title' => 'Honor Guard Officer', 'blurb' => 'Enforces the Klingon code of honor across the crew, presides over challenges of rank, and records deeds worthy of the sagas.'],
            ['title' => 'Discommendation Arbiter', 'blurb' => 'Reviews accusations of cowardice or treachery brought before the High Council and renders binding verdicts of honor or exile.'],
            ['title' => 'House Steward', 'blurb' => "Manages a Great House's holdings, bloodwine stores, and retainers, and keeps its political alliances from collapsing into open bat'leth duels."],
        ];
    }

    /** @return array<int, string> */
    private function ferengiLocations(): array
    {
        return [
            'Ferenginar Commerce Exchange', "Nagus's Tower", "Quark's Bar, Deep Space 9",
            'Ferengi Trade Consortium HQ', 'DaiMon Vessel Krayton', 'DaiMon Vessel Marauder Gint',
            'Dopterian Trade Route Outpost', 'Ferengi Commerce Authority Hall', 'Tulaberry Wine Exchange',
            'Latinum Reserve Vault', "Grand Nagus's Shuttle", 'Ferengi Alliance Embassy, Earth',
            'Orb of Business Exchange', 'Rules of Acquisition Archive', "Moogie's House",
            'Ferengi Trading Post Epsilon', 'Gamma Quadrant Trade Station', 'Ferengi Marauder Kreechta',
            'Ferengi Marauder Wexx', 'Dabo Parlor Consortium', 'Free Haven Trade Post',
            "Zek's Retirement Villa, Risa", 'Ferengi Futures Exchange', 'Risa Timeshare Office',
            "Nog's Financial Consultancy",
        ];
    }

    /** @return array<int, array{title: string, blurb: string}> */
    private function ferengiRoles(): array
    {
        return [
            ['title' => 'Vice President of Commerce', 'blurb' => 'Oversees trade routes and latinum flow across the Alliance, negotiates tariffs with non-Ferengi partners, and answers only to the Nagus.'],
            ['title' => 'DaiMon', 'blurb' => 'Commands a Marauder-class trading vessel, negotiates cargo deals at disruptor-point when necessary, and keeps ninety-five percent of any resulting profit.'],
            ['title' => "Nagus's Financial Advisor", 'blurb' => 'Interprets the Rules of Acquisition for the Grand Nagus in real time and structures deals that technically remain within Ferengi law.'],
            ['title' => 'Latinum Auditor', 'blurb' => 'Verifies the purity of gold-pressed latinum reserves and investigates counterfeit slips of strip-mined worthless gold.'],
            ['title' => 'Trade Negotiator', 'blurb' => 'Closes contracts across quadrant borders, exploiting loophole clauses in Federation and Klingon trade law alike.'],
            ['title' => 'Dabo Floor Manager', 'blurb' => 'Oversees dabo tables and holosuite revenue, ensures the house percentage stays favorable, and settles disputes over rigged wheels.'],
            ['title' => 'Concessions Manager', 'blurb' => 'Runs bar and lodging concessions on a leased station, balancing rent to the Nagus against margin on every drink and room.'],
            ['title' => 'Acquisitions Broker', 'blurb' => 'Sources rare technology, salvage, and intelligence for resale, operating comfortably in gray markets across three quadrants.'],
        ];
    }

    /** @return array<int, string> */
    private function cardassianLocations(): array
    {
        return [
            'Cardassia Prime Capital', 'Central Command HQ', 'Obsidian Order Archive',
            'Terok Nor', 'Empok Nor', "Gul Dukat's Flagship Kraxon", 'Cardassian Union Embassy',
            'Bajoran Occupation Zone Garrison', 'Lakat Prison Facility', 'Torros III Listening Post',
            'Cardassian Science Ministry', 'Prime Continental Congress', "Tain's Safehouse",
            "Damar's Resistance HQ", 'Cardassian Shipyards at Rakal', 'Gault Colony Outpost',
            'Mekar Throne Listening Station', "Chin'toka Front Base", 'Betreka Nebula Outpost',
            'Cardassian Repatriation Camp',
        ];
    }

    /** @return array<int, array{title: string, blurb: string}> */
    private function cardassianRoles(): array
    {
        return [
            ['title' => 'Gul', 'blurb' => 'Commands a Cardassian military unit or vessel, executing Central Command directives without deviation and reporting occupation-zone status weekly.'],
            ['title' => 'Glinn', 'blurb' => 'Serves as executive officer beneath a Gul, manages ship discipline, and is first in line for command upon a superior\'s disgrace or death.'],
            ['title' => 'Obsidian Order Operative', 'blurb' => 'Conducts surveillance, interrogation, and covert action for an organization that, officially, does not exist.'],
            ['title' => 'Science Ministry Analyst', 'blurb' => 'Evaluates captured Federation and Klingon technology for military application and reports findings directly to Central Command.'],
            ['title' => 'Tribunal Prosecutor', 'blurb' => 'Presents the state\'s case in Cardassian criminal proceedings, where conviction is determined before the trial begins and confession is expected.'],
            ['title' => 'Resistance Liaison', 'blurb' => 'Maintains lines to underground Cardassian dissident cells during and after the Dominion occupation, balancing loyalty to Cardassia against loyalty to its people.'],
            ['title' => "Legate's Aide", 'blurb' => 'Manages correspondence, security, and scheduling for a senior Legate, and quietly absorbs blame for decisions made above their pay grade.'],
        ];
    }

    /** @return array<int, string> */
    private function romulanLocations(): array
    {
        return [
            'Romulus Capital Complex', 'ChR Haakona', 'ChR Khazara', 'ChR Terix', 'ChR Decius',
            "ChR D'Deridex", 'Tal Shiar Headquarters', 'Romulan Senate Chamber', 'Ki Baratan Shipyards',
            'Romulan Star Empire Embassy', 'Remus Mining Colony', 'Ferasa Sector Outpost',
            'Nelvana III Listening Post', 'Romulan Neutral Zone Picket', 'Devoras Wreckage Site',
            'Unification Movement Safehouse', 'Empire Science Academy', "Praetor's Residence",
            'Romulan Free State Council', 'Vastam Border Station',
        ];
    }

    /** @return array<int, array{title: string, blurb: string}> */
    private function romulanRoles(): array
    {
        return [
            ['title' => 'Warbird Commander', 'blurb' => 'Commands a D\'deridex-class warbird beneath the cloak, striking Federation and Klingon targets with plausible deniability intact.'],
            ['title' => 'Sub-Commander', 'blurb' => 'Serves as second-in-command and, more often than the crew realizes, as the Tal Shiar\'s eyes aboard the vessel.'],
            ['title' => 'Tal Shiar Operative', 'blurb' => 'Runs deep-cover intelligence operations against the Federation, the Empire\'s own Senate, and, when useful, other Tal Shiar cells.'],
            ['title' => "Senator's Aide", 'blurb' => 'Manages a Senator\'s public schedule and private intrigues, and knows which of the two will get them killed first.'],
            ['title' => 'Cloaking Systems Engineer', 'blurb' => 'Maintains cloaking-device power curves and singularity core containment, where a miscalculation is instantly and permanently fatal.'],
            ['title' => 'Praetorian Guard', 'blurb' => "Protects the Praetor's person and residence, sworn to a loyalty that has, historically, not always survived contact with ambition."],
            ['title' => 'Intelligence Analyst', 'blurb' => 'Processes intercepted subspace traffic from Federation, Klingon, and Romulan-dissident sources for the Empire\'s strategic planners.'],
        ];
    }
}
