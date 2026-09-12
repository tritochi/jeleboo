// Jeleboo — nearest Malaysian WAQI station by city slug.
//
// Every entry below was returned by WAQI's own /search/?keyword= endpoint and
// filtered to stations physically in Malaysia, then deduplicated. No
// coordinates, slugs, or station names are invented — they all came from WAQI.
//
// Used as the fallback resolution path when WAQI's coordinate endpoint
// (/feed/@lat,lng/) reports "Unknown station", which is currently the case.
// When the coordinate endpoint is healthy again, it is tried first and this
// table is only consulted on failure.

export interface CityStation {
    name: string;
    slug: string;
    lat: number;
    lng: number;
    uid: number;
}

export const MALAYSIA_CITY_STATIONS: readonly CityStation[] = [
    { name: "Kota Tinggi, Johor", slug: "malaysia/johor/kota-tinggi", lat: 1.564056, lng: 104.225306, uid: 2577 },
    { name: "Larkin Lama, Johor", slug: "malaysia/johor/larkin-lama", lat: 1.494625, lng: 103.735975, uid: 2578 },
    { name: "Muar, Johor", slug: "malaysia/johor/muar", lat: 2.061969, lng: 102.593131, uid: 2579 },
    { name: "Pasir Gudang, Johor", slug: "malaysia/johor/pasir-gudang", lat: 1.470122, lng: 103.893456, uid: 2580 },
    { name: "Segamat, Johor", slug: "malaysia/johor/segamat", lat: 2.493914, lng: 102.862694, uid: 9492 },
    { name: "Batu Pahat, Johor", slug: "malaysia/johor/batu-pahat", lat: 1.919323, lng: 102.866618, uid: 9493 },
    { name: "Kluang, Johor", slug: "malaysia/johor/kluang", lat: 2.037882, lng: 103.312063, uid: 9494 },
    { name: "Pengerang, Johor", slug: "malaysia/johor/pengerang", lat: 1.389489, lng: 104.149586, uid: 9495 },
    { name: "Tangkak, Johor", slug: "malaysia/johor/tangkak", lat: 2.294794, lng: 102.571595, uid: 10484 },
    { name: "Alor Setar, Kedah", slug: "malaysia/kedah/alor-setar", lat: 6.137244, lng: 100.346815, uid: 2581 },
    { name: "Bakar Arang, Sg. Petani, Kedah", slug: "malaysia/kedah/bakar-arang--sg.-petani", lat: 5.629631, lng: 100.467771, uid: 2582 },
    { name: "Langkawi, Kedah", slug: "malaysia/kedah/langkawi", lat: 6.331539, lng: 99.85846, uid: 2583 },
    { name: "Kulim Hi-Tech, Kedah", slug: "malaysia/kedah/kulim-hi-tech", lat: 5.401688, lng: 100.58968, uid: 9488 },
    { name: "SMK Tanjung Chat, Kota Bharu, Kelantan", slug: "malaysia/kelantan/smk-tanjung-chat--kota-bharu", lat: 6.147431, lng: 102.249236, uid: 2584 },
    { name: "Tanah Merah, Kelantan", slug: "malaysia/kelantan/tanah-merah", lat: 5.811172, lng: 102.1345, uid: 2585 },
    { name: "Kota Bharu, Kelantan", slug: "malaysia/kelantan/kota-bharu", lat: 6.147431, lng: 102.249236, uid: 9556 },
    { name: "Bandaraya Melaka, Melaka", slug: "malaysia/melaka/bandaraya-melaka", lat: 2.190936, lng: 102.257058, uid: 2586 },
    { name: "Bukit Rambai, Melaka", slug: "malaysia/melaka/bukit-rambai", lat: 2.258519, lng: 102.172683, uid: 2587 },
    { name: "Alor Gajah, Melaka", slug: "malaysia/melaka/alor-gajah", lat: 2.370925, lng: 102.224592, uid: 9491 },
    { name: "Nilai, Negeri Sembilan", slug: "malaysia/negeri-sembilan/nilai", lat: 2.821692, lng: 101.811486, uid: 2588 },
    { name: "Port Dickson, Negeri Sembilan", slug: "malaysia/negeri-sembilan/port-dickson", lat: 2.441383, lng: 101.866858, uid: 2589 },
    { name: "Seremban, Negeri Sembilan", slug: "malaysia/negeri-sembilan/seremban", lat: 2.723381, lng: 101.968497, uid: 2590 },
    { name: "Balok Baru, Kuantan, Pahang", slug: "malaysia/pahang/balok-baru--kuantan", lat: 3.960644, lng: 103.382158, uid: 2591 },
    { name: "Indera Mahkota, Kuantan, Pahang", slug: "malaysia/pahang/indera-mahkota--kuantan", lat: 3.819217, lng: 103.29655, uid: 2592 },
    { name: "Jerantut, Pahang", slug: "malaysia/pahang/jerantut", lat: 3.94836, lng: 102.366632, uid: 2593 },
    { name: "Rompin, Pahang", slug: "malaysia/pahang/rompin", lat: 2.926645, lng: 103.419198, uid: 9496 },
    { name: "Temerloh, Pahang", slug: "malaysia/pahang/temerloh", lat: 3.471603, lng: 102.376406, uid: 9497 },
    { name: "Jalan Tasek, Ipoh, Perak", slug: "malaysia/perak/jalan-tasek--ipoh", lat: 4.629444, lng: 101.11665, uid: 2594 },
    { name: "Kg. Air Putih, Taiping, Perak", slug: "malaysia/perak/kg.-air-putih--taiping", lat: 4.89885, lng: 100.679106, uid: 2595 },
    { name: "S K Jalan Pegoh, Ipoh, Perak", slug: "malaysia/perak/s-k-jalan-pegoh--ipoh", lat: 4.553336, lng: 101.080236, uid: 2596 },
    { name: "Seri Manjung, Perak", slug: "malaysia/perak/seri-manjung", lat: 4.200344, lng: 100.663358, uid: 2597 },
    { name: "Tanjung Malim, Perak", slug: "malaysia/perak/tanjung-malim", lat: 3.687758, lng: 101.524494, uid: 2598 },
    { name: "Kangar, Perlis", slug: "malaysia/perlis/kangar", lat: 6.429922, lng: 100.211069, uid: 2599 },
    { name: "Perai, Pulau Pinang", slug: "malaysia/pulau-pinang/perai", lat: 5.329358, lng: 100.443475, uid: 2600 },
    { name: "Seberang Jaya 2, Perai, Pulau Pinang", slug: "malaysia/pulau-pinang/seberang-jaya-2--perai", lat: 5.39817, lng: 100.403947, uid: 2601 },
    { name: "USM, Pulau Pinang", slug: "malaysia/pulau-pinang/usm", lat: 5.357664, lng: 100.294567, uid: 2602 },
    { name: "Minden, Pulau Pinang", slug: "malaysia/pulau-pinang/minden", lat: 5.356211, lng: 100.30792, uid: 9489 },
    { name: "Keningau, Sabah", slug: "malaysia/sabah/keningau", lat: 5.339317, lng: 116.163658, uid: 2603 },
    { name: "Kota Kinabalu, Sabah", slug: "malaysia/sabah/kota-kinabalu", lat: 5.89372, lng: 116.04327, uid: 2604 },
    { name: "Sandakan, Sabah", slug: "malaysia/sabah/sandakan", lat: 5.864467, lng: 118.091089, uid: 2605 },
    { name: "Tawau, Sabah", slug: "malaysia/sabah/tawau", lat: 4.249786, lng: 117.935864, uid: 2606 },
    { name: "Kimanis, Sabah", slug: "malaysia/sabah/kimanis", lat: 5.538225, lng: 115.850556, uid: 9499 },
    { name: "Bintulu, Sarawak", slug: "malaysia/sarawak/bintulu", lat: 3.177084, lng: 113.041091, uid: 2607 },
    { name: "ILP Miri, Sarawak", slug: "malaysia/sarawak/ilp-miri", lat: 4.494791, lng: 114.043416, uid: 2608 },
    { name: "Kapit, Sarawak", slug: "malaysia/sarawak/kapit", lat: 2.014498, lng: 112.92736, uid: 2609 },
    { name: "Kuching, Sarawak", slug: "malaysia/sarawak/kuching", lat: 1.562229, lng: 110.388958, uid: 2610 },
    { name: "Limbang, Sarawak", slug: "malaysia/sarawak/limbang", lat: 4.758891, lng: 115.013667, uid: 2611 },
    { name: "Miri, Sarawak", slug: "malaysia/sarawak/miri", lat: 4.424679, lng: 114.012426, uid: 2612 },
    { name: "Samarahan, Sarawak", slug: "malaysia/sarawak/samarahan", lat: 1.454853, lng: 110.491505, uid: 2613 },
    { name: "Sarikei, Sarawak", slug: "malaysia/sarawak/sarikei", lat: 2.132809, lng: 111.52287, uid: 2614 },
    { name: "Sibu, Sarawak", slug: "malaysia/sarawak/sibu", lat: 2.314408, lng: 111.831916, uid: 2615 },
    { name: "Sri Aman, Sarawak", slug: "malaysia/sarawak/sri-aman", lat: 1.219656, lng: 111.464792, uid: 2616 },
    { name: "Samalaju, Sarawak", slug: "malaysia/sarawak/samalaju", lat: 3.537059, lng: 113.295168, uid: 9500 },
    { name: "Mukah, Sarawak", slug: "malaysia/sarawak/mukah", lat: 2.883238, lng: 112.019742, uid: 9501 },
    { name: "Banting, Selangor", slug: "malaysia/selangor/banting", lat: 2.816689, lng: 101.623158, uid: 2617 },
    { name: "Kuala Selangor, Selangor", slug: "malaysia/selangor/kuala-selangor", lat: 3.321308, lng: 101.256242, uid: 2618 },
    { name: "Pelabuhan Kelang, Selangor", slug: "malaysia/selangor/pelabuhan-kelang", lat: 3.014889, lng: 101.413111, uid: 2619 },
    { name: "Petaling Jaya, Selangor", slug: "malaysia/selangor/petaling-jaya", lat: 3.133169, lng: 101.608011, uid: 2620 },
    { name: "Shah Alam, Selangor", slug: "malaysia/selangor/shah-alam", lat: 3.104717, lng: 101.556222, uid: 2621 },
    { name: "Kemaman, Terengganu", slug: "malaysia/terengganu/kemaman", lat: 4.262121, lng: 103.425778, uid: 2622 },
    { name: "Kuala Terengganu, Terengganu", slug: "malaysia/terengganu/kuala-terengganu", lat: 5.308094, lng: 103.120392, uid: 2623 },
    { name: "Paka, Terengganu", slug: "malaysia/terengganu/paka", lat: 4.598064, lng: 103.434819, uid: 2624 },
    { name: "Besut, Terengganu", slug: "malaysia/terengganu/besut", lat: 5.748449, lng: 102.515632, uid: 9498 },
    { name: "Batu Muda, Kuala Lumpur, Wilayah Persekutuan", slug: "malaysia/wilayah-persekutuan/batu-muda-kuala-lumpur", lat: 3.212439, lng: 101.682228, uid: 2625 },
    { name: "Cheras, Kuala Lumpur, Wilayah Persekutuan", slug: "malaysia/wilayah-persekutuan/cheras-kuala-lumpur", lat: 3.106236, lng: 101.717917, uid: 2626 },
    { name: "Labuan, Wilayah Persekutuan", slug: "malaysia/wilayah-persekutuan/labuan", lat: 5.298107, lng: 115.232106, uid: 2627 },
    { name: "Putrajaya, Wilayah Persekutuan", slug: "malaysia/wilayah-persekutuan/putrajaya", lat: 2.914816, lng: 101.69005, uid: 2628 },
    { name: "Putrajaya, W.p. Putrajaya", slug: "malaysia/w.p.-putrajaya/putrajaya", lat: 2.914816, lng: 101.69005, uid: 10485 },
    { name: "Ipoh", slug: "ipoh", lat: 4.61175, lng: 101.113506, uid: 5777 },
    { name: "Perai", slug: "perai", lat: 5.384388, lng: 100.3896169, uid: 5778 },
    { name: "Miri", slug: "miri", lat: 4.333131, lng: 113.99486, uid: 5779 },
    { name: "Kuala Lumpur", slug: "kuala-lumpur", lat: 3.139003, lng: 101.686855, uid: 5780 },
    { name: "US Embassy, Kuala Lumpur", slug: "malaysia/kuala-lumpur/us-embassy", lat: 3.15675, lng: 101.72145, uid: 14721 },
];

/**
 * Return the nearest known Malaysian station to a lat/lng, by straight-line
 * distance. Used only as the fallback resolution path.
 */
export function nearestCityStation(lat: number, lng: number): CityStation | null {
    if (!MALAYSIA_CITY_STATIONS.length) return null;
    let best: CityStation | null = null;
    let bestDist = Infinity;
    for (const s of MALAYSIA_CITY_STATIONS) {
        const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2;
        if (d < bestDist) {
            bestDist = d;
            best = s;
        }
    }
    return best;
}