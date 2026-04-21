/**
 * Comprehensive list of countries with ISO 3166-1 codes
 * Used for nationality and country selection dropdowns
 */

export interface Country {
  code: string; // ISO alpha-2 code
  name: string;
  isBhutanese: boolean;
}

export const COUNTRIES: Country[] = [
  { code: 'AD', name: 'Andorra', isBhutanese: false },
  { code: 'AE', name: 'United Arab Emirates', isBhutanese: false },
  { code: 'AF', name: 'Afghanistan', isBhutanese: false },
  { code: 'AG', name: 'Antigua and Barbuda', isBhutanese: false },
  { code: 'AI', name: 'Anguilla', isBhutanese: false },
  { code: 'AL', name: 'Albania', isBhutanese: false },
  { code: 'AM', name: 'Armenia', isBhutanese: false },
  { code: 'AO', name: 'Angola', isBhutanese: false },
  { code: 'AQ', name: 'Antarctica', isBhutanese: false },
  { code: 'AR', name: 'Argentina', isBhutanese: false },
  { code: 'AS', name: 'American Samoa', isBhutanese: false },
  { code: 'AT', name: 'Austria', isBhutanese: false },
  { code: 'AU', name: 'Australia', isBhutanese: false },
  { code: 'AW', name: 'Aruba', isBhutanese: false },
  { code: 'AX', name: 'Aland Islands', isBhutanese: false },
  { code: 'AZ', name: 'Azerbaijan', isBhutanese: false },
  { code: 'BA', name: 'Bosnia and Herzegovina', isBhutanese: false },
  { code: 'BB', name: 'Barbados', isBhutanese: false },
  { code: 'BD', name: 'Bangladesh', isBhutanese: false },
  { code: 'BE', name: 'Belgium', isBhutanese: false },
  { code: 'BF', name: 'Burkina Faso', isBhutanese: false },
  { code: 'BG', name: 'Bulgaria', isBhutanese: false },
  { code: 'BH', name: 'Bahrain', isBhutanese: false },
  { code: 'BI', name: 'Burundi', isBhutanese: false },
  { code: 'BJ', name: 'Benin', isBhutanese: false },
  { code: 'BL', name: 'Saint Barthelemy', isBhutanese: false },
  { code: 'BM', name: 'Bermuda', isBhutanese: false },
  { code: 'BN', name: 'Brunei', isBhutanese: false },
  { code: 'BO', name: 'Bolivia', isBhutanese: false },
  { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba', isBhutanese: false },
  { code: 'BR', name: 'Brazil', isBhutanese: false },
  { code: 'BS', name: 'Bahamas', isBhutanese: false },
  { code: 'BT', name: 'Bhutan', isBhutanese: true },
  { code: 'BV', name: 'Bouvet Island', isBhutanese: false },
  { code: 'BW', name: 'Botswana', isBhutanese: false },
  { code: 'BY', name: 'Belarus', isBhutanese: false },
  { code: 'BZ', name: 'Belize', isBhutanese: false },
  { code: 'CA', name: 'Canada', isBhutanese: false },
  { code: 'CC', name: 'Cocos Islands', isBhutanese: false },
  { code: 'CD', name: 'Congo (Democratic Republic)', isBhutanese: false },
  { code: 'CF', name: 'Central African Republic', isBhutanese: false },
  { code: 'CG', name: 'Congo', isBhutanese: false },
  { code: 'CH', name: 'Switzerland', isBhutanese: false },
  { code: 'CI', name: 'Ivory Coast', isBhutanese: false },
  { code: 'CK', name: 'Cook Islands', isBhutanese: false },
  { code: 'CL', name: 'Chile', isBhutanese: false },
  { code: 'CM', name: 'Cameroon', isBhutanese: false },
  { code: 'CN', name: 'China', isBhutanese: false },
  { code: 'CO', name: 'Colombia', isBhutanese: false },
  { code: 'CR', name: 'Costa Rica', isBhutanese: false },
  { code: 'CU', name: 'Cuba', isBhutanese: false },
  { code: 'CV', name: 'Cape Verde', isBhutanese: false },
  { code: 'CW', name: 'Curacao', isBhutanese: false },
  { code: 'CX', name: 'Christmas Island', isBhutanese: false },
  { code: 'CY', name: 'Cyprus', isBhutanese: false },
  { code: 'CZ', name: 'Czechia', isBhutanese: false },
  { code: 'DE', name: 'Germany', isBhutanese: false },
  { code: 'DJ', name: 'Djibouti', isBhutanese: false },
  { code: 'DK', name: 'Denmark', isBhutanese: false },
  { code: 'DM', name: 'Dominica', isBhutanese: false },
  { code: 'DO', name: 'Dominican Republic', isBhutanese: false },
  { code: 'DZ', name: 'Algeria', isBhutanese: false },
  { code: 'EC', name: 'Ecuador', isBhutanese: false },
  { code: 'EE', name: 'Estonia', isBhutanese: false },
  { code: 'EG', name: 'Egypt', isBhutanese: false },
  { code: 'EH', name: 'Western Sahara', isBhutanese: false },
  { code: 'ER', name: 'Eritrea', isBhutanese: false },
  { code: 'ES', name: 'Spain', isBhutanese: false },
  { code: 'ET', name: 'Ethiopia', isBhutanese: false },
  { code: 'FI', name: 'Finland', isBhutanese: false },
  { code: 'FJ', name: 'Fiji', isBhutanese: false },
  { code: 'FK', name: 'Falkland Islands', isBhutanese: false },
  { code: 'FM', name: 'Micronesia', isBhutanese: false },
  { code: 'FO', name: 'Faroe Islands', isBhutanese: false },
  { code: 'FR', name: 'France', isBhutanese: false },
  { code: 'GA', name: 'Gabon', isBhutanese: false },
  { code: 'GB', name: 'United Kingdom', isBhutanese: false },
  { code: 'GD', name: 'Grenada', isBhutanese: false },
  { code: 'GE', name: 'Georgia', isBhutanese: false },
  { code: 'GF', name: 'French Guiana', isBhutanese: false },
  { code: 'GG', name: 'Guernsey', isBhutanese: false },
  { code: 'GH', name: 'Ghana', isBhutanese: false },
  { code: 'GI', name: 'Gibraltar', isBhutanese: false },
  { code: 'GL', name: 'Greenland', isBhutanese: false },
  { code: 'GM', name: 'Gambia', isBhutanese: false },
  { code: 'GN', name: 'Guinea', isBhutanese: false },
  { code: 'GP', name: 'Guadeloupe', isBhutanese: false },
  { code: 'GQ', name: 'Equatorial Guinea', isBhutanese: false },
  { code: 'GR', name: 'Greece', isBhutanese: false },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands', isBhutanese: false },
  { code: 'GT', name: 'Guatemala', isBhutanese: false },
  { code: 'GU', name: 'Guam', isBhutanese: false },
  { code: 'GW', name: 'Guinea-Bissau', isBhutanese: false },
  { code: 'GY', name: 'Guyana', isBhutanese: false },
  { code: 'HK', name: 'Hong Kong', isBhutanese: false },
  { code: 'HM', name: 'Heard Island and McDonald Islands', isBhutanese: false },
  { code: 'HN', name: 'Honduras', isBhutanese: false },
  { code: 'HR', name: 'Croatia', isBhutanese: false },
  { code: 'HT', name: 'Haiti', isBhutanese: false },
  { code: 'HU', name: 'Hungary', isBhutanese: false },
  { code: 'ID', name: 'Indonesia', isBhutanese: false },
  { code: 'IE', name: 'Ireland', isBhutanese: false },
  { code: 'IL', name: 'Israel', isBhutanese: false },
  { code: 'IM', name: 'Isle of Man', isBhutanese: false },
  { code: 'IN', name: 'India', isBhutanese: false },
  { code: 'IO', name: 'British Indian Ocean Territory', isBhutanese: false },
  { code: 'IQ', name: 'Iraq', isBhutanese: false },
  { code: 'IR', name: 'Iran', isBhutanese: false },
  { code: 'IS', name: 'Iceland', isBhutanese: false },
  { code: 'IT', name: 'Italy', isBhutanese: false },
  { code: 'JE', name: 'Jersey', isBhutanese: false },
  { code: 'JM', name: 'Jamaica', isBhutanese: false },
  { code: 'JO', name: 'Jordan', isBhutanese: false },
  { code: 'JP', name: 'Japan', isBhutanese: false },
  { code: 'KE', name: 'Kenya', isBhutanese: false },
  { code: 'KG', name: 'Kyrgyzstan', isBhutanese: false },
  { code: 'KH', name: 'Cambodia', isBhutanese: false },
  { code: 'KI', name: 'Kiribati', isBhutanese: false },
  { code: 'KM', name: 'Comoros', isBhutanese: false },
  { code: 'KN', name: 'Saint Kitts and Nevis', isBhutanese: false },
  { code: 'KP', name: 'North Korea', isBhutanese: false },
  { code: 'KR', name: 'South Korea', isBhutanese: false },
  { code: 'KW', name: 'Kuwait', isBhutanese: false },
  { code: 'KY', name: 'Cayman Islands', isBhutanese: false },
  { code: 'KZ', name: 'Kazakhstan', isBhutanese: false },
  { code: 'LA', name: 'Laos', isBhutanese: false },
  { code: 'LB', name: 'Lebanon', isBhutanese: false },
  { code: 'LC', name: 'Saint Lucia', isBhutanese: false },
  { code: 'LI', name: 'Liechtenstein', isBhutanese: false },
  { code: 'LK', name: 'Sri Lanka', isBhutanese: false },
  { code: 'LR', name: 'Liberia', isBhutanese: false },
  { code: 'LS', name: 'Lesotho', isBhutanese: false },
  { code: 'LT', name: 'Lithuania', isBhutanese: false },
  { code: 'LU', name: 'Luxembourg', isBhutanese: false },
  { code: 'LV', name: 'Latvia', isBhutanese: false },
  { code: 'LY', name: 'Libya', isBhutanese: false },
  { code: 'MA', name: 'Morocco', isBhutanese: false },
  { code: 'MC', name: 'Monaco', isBhutanese: false },
  { code: 'MD', name: 'Moldova', isBhutanese: false },
  { code: 'ME', name: 'Montenegro', isBhutanese: false },
  { code: 'MF', name: 'Saint Martin', isBhutanese: false },
  { code: 'MG', name: 'Madagascar', isBhutanese: false },
  { code: 'MH', name: 'Marshall Islands', isBhutanese: false },
  { code: 'MK', name: 'North Macedonia', isBhutanese: false },
  { code: 'ML', name: 'Mali', isBhutanese: false },
  { code: 'MM', name: 'Myanmar', isBhutanese: false },
  { code: 'MN', name: 'Mongolia', isBhutanese: false },
  { code: 'MO', name: 'Macao', isBhutanese: false },
  { code: 'MP', name: 'Northern Mariana Islands', isBhutanese: false },
  { code: 'MQ', name: 'Martinique', isBhutanese: false },
  { code: 'MR', name: 'Mauritania', isBhutanese: false },
  { code: 'MS', name: 'Montserrat', isBhutanese: false },
  { code: 'MT', name: 'Malta', isBhutanese: false },
  { code: 'MU', name: 'Mauritius', isBhutanese: false },
  { code: 'MV', name: 'Maldives', isBhutanese: false },
  { code: 'MW', name: 'Malawi', isBhutanese: false },
  { code: 'MX', name: 'Mexico', isBhutanese: false },
  { code: 'MY', name: 'Malaysia', isBhutanese: false },
  { code: 'MZ', name: 'Mozambique', isBhutanese: false },
  { code: 'NA', name: 'Namibia', isBhutanese: false },
  { code: 'NC', name: 'New Caledonia', isBhutanese: false },
  { code: 'NE', name: 'Niger', isBhutanese: false },
  { code: 'NF', name: 'Norfolk Island', isBhutanese: false },
  { code: 'NG', name: 'Nigeria', isBhutanese: false },
  { code: 'NI', name: 'Nicaragua', isBhutanese: false },
  { code: 'NL', name: 'Netherlands', isBhutanese: false },
  { code: 'NO', name: 'Norway', isBhutanese: false },
  { code: 'NP', name: 'Nepal', isBhutanese: false },
  { code: 'NR', name: 'Nauru', isBhutanese: false },
  { code: 'NU', name: 'Niue', isBhutanese: false },
  { code: 'NZ', name: 'New Zealand', isBhutanese: false },
  { code: 'OM', name: 'Oman', isBhutanese: false },
  { code: 'PA', name: 'Panama', isBhutanese: false },
  { code: 'PE', name: 'Peru', isBhutanese: false },
  { code: 'PF', name: 'French Polynesia', isBhutanese: false },
  { code: 'PG', name: 'Papua New Guinea', isBhutanese: false },
  { code: 'PH', name: 'Philippines', isBhutanese: false },
  { code: 'PK', name: 'Pakistan', isBhutanese: false },
  { code: 'PL', name: 'Poland', isBhutanese: false },
  { code: 'PM', name: 'Saint Pierre and Miquelon', isBhutanese: false },
  { code: 'PN', name: 'Pitcairn', isBhutanese: false },
  { code: 'PR', name: 'Puerto Rico', isBhutanese: false },
  { code: 'PS', name: 'Palestine', isBhutanese: false },
  { code: 'PT', name: 'Portugal', isBhutanese: false },
  { code: 'PW', name: 'Palau', isBhutanese: false },
  { code: 'PY', name: 'Paraguay', isBhutanese: false },
  { code: 'QA', name: 'Qatar', isBhutanese: false },
  { code: 'RE', name: 'Reunion', isBhutanese: false },
  { code: 'RO', name: 'Romania', isBhutanese: false },
  { code: 'RS', name: 'Serbia', isBhutanese: false },
  { code: 'RU', name: 'Russia', isBhutanese: false },
  { code: 'RW', name: 'Rwanda', isBhutanese: false },
  { code: 'SA', name: 'Saudi Arabia', isBhutanese: false },
  { code: 'SB', name: 'Solomon Islands', isBhutanese: false },
  { code: 'SC', name: 'Seychelles', isBhutanese: false },
  { code: 'SD', name: 'Sudan', isBhutanese: false },
  { code: 'SE', name: 'Sweden', isBhutanese: false },
  { code: 'SG', name: 'Singapore', isBhutanese: false },
  { code: 'SH', name: 'Saint Helena', isBhutanese: false },
  { code: 'SI', name: 'Slovenia', isBhutanese: false },
  { code: 'SJ', name: 'Svalbard and Jan Mayen', isBhutanese: false },
  { code: 'SK', name: 'Slovakia', isBhutanese: false },
  { code: 'SL', name: 'Sierra Leone', isBhutanese: false },
  { code: 'SM', name: 'San Marino', isBhutanese: false },
  { code: 'SN', name: 'Senegal', isBhutanese: false },
  { code: 'SO', name: 'Somalia', isBhutanese: false },
  { code: 'SR', name: 'Suriname', isBhutanese: false },
  { code: 'SS', name: 'South Sudan', isBhutanese: false },
  { code: 'ST', name: 'Sao Tome and Principe', isBhutanese: false },
  { code: 'SV', name: 'El Salvador', isBhutanese: false },
  { code: 'SX', name: 'Sint Maarten', isBhutanese: false },
  { code: 'SY', name: 'Syria', isBhutanese: false },
  { code: 'SZ', name: 'Eswatini', isBhutanese: false },
  { code: 'TC', name: 'Turks and Caicos Islands', isBhutanese: false },
  { code: 'TD', name: 'Chad', isBhutanese: false },
  { code: 'TF', name: 'French Southern Territories', isBhutanese: false },
  { code: 'TG', name: 'Togo', isBhutanese: false },
  { code: 'TH', name: 'Thailand', isBhutanese: false },
  { code: 'TJ', name: 'Tajikistan', isBhutanese: false },
  { code: 'TK', name: 'Tokelau', isBhutanese: false },
  { code: 'TL', name: 'Timor-Leste', isBhutanese: false },
  { code: 'TM', name: 'Turkmenistan', isBhutanese: false },
  { code: 'TN', name: 'Tunisia', isBhutanese: false },
  { code: 'TO', name: 'Tonga', isBhutanese: false },
  { code: 'TR', name: 'Turkey', isBhutanese: false },
  { code: 'TT', name: 'Trinidad and Tobago', isBhutanese: false },
  { code: 'TV', name: 'Tuvalu', isBhutanese: false },
  { code: 'TW', name: 'Taiwan', isBhutanese: false },
  { code: 'TZ', name: 'Tanzania', isBhutanese: false },
  { code: 'UA', name: 'Ukraine', isBhutanese: false },
  { code: 'UG', name: 'Uganda', isBhutanese: false },
  { code: 'UM', name: 'United States Minor Outlying Islands', isBhutanese: false },
  { code: 'US', name: 'United States of America', isBhutanese: false },
  { code: 'UY', name: 'Uruguay', isBhutanese: false },
  { code: 'UZ', name: 'Uzbekistan', isBhutanese: false },
  { code: 'VA', name: 'Vatican City', isBhutanese: false },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', isBhutanese: false },
  { code: 'VE', name: 'Venezuela', isBhutanese: false },
  { code: 'VG', name: 'Virgin Islands (British)', isBhutanese: false },
  { code: 'VI', name: 'Virgin Islands (U.S.)', isBhutanese: false },
  { code: 'VN', name: 'Vietnam', isBhutanese: false },
  { code: 'VU', name: 'Vanuatu', isBhutanese: false },
  { code: 'WF', name: 'Wallis and Futuna', isBhutanese: false },
  { code: 'WS', name: 'Samoa', isBhutanese: false },
  { code: 'YE', name: 'Yemen', isBhutanese: false },
  { code: 'YT', name: 'Mayotte', isBhutanese: false },
  { code: 'ZA', name: 'South Africa', isBhutanese: false },
  { code: 'ZM', name: 'Zambia', isBhutanese: false },
  { code: 'ZW', name: 'Zimbabwe', isBhutanese: false },
];

/**
 * Check if a country is Bhutan
 * @param countryName - Name of the country
 * @returns true if the country is Bhutan
 */
export const getBhutaneseStatus = (countryName: string): boolean => {
  return countryName.toLowerCase() === 'bhutan';
};

/**
 * Get all country names sorted alphabetically with Bhutan at the top
 * @returns Array of country names sorted with Bhutan first
 */
export const getCountryNames = (): string[] => {
  const names = COUNTRIES.map((country) => country.name);
  const sortedNames = names.sort((a, b) => a.localeCompare(b));

  // Move Bhutan to the top
  const bhutanIndex = sortedNames.indexOf('Bhutan');
  if (bhutanIndex > -1) {
    sortedNames.splice(bhutanIndex, 1);
    sortedNames.unshift('Bhutan');
  }

  return sortedNames;
};

/**
 * Get country by name
 * @param countryName - Name of the country
 * @returns Country object or undefined
 */
export const getCountryByName = (countryName: string): Country | undefined => {
  return COUNTRIES.find(
    (country) => country.name.toLowerCase() === countryName.toLowerCase()
  );
};

/**
 * Get country by ISO code
 * @param code - ISO alpha-2 code
 * @returns Country object or undefined
 */
export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(
    (country) => country.code.toUpperCase() === code.toUpperCase()
  );
};
