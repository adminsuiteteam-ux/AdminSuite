import * as Sentry from '@sentry/browser';

// Initialize Sentry when a real DSN is provided via env var
const _webSentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN;
if (_webSentryDsn && _webSentryDsn !== 'YOUR_SENTRY_DSN_HERE') {
  Sentry.init({
    dsn: _webSentryDsn,
    tracesSampleRate: 1.0,
    sendDefaultPii: false, // Keep PII safe
  });
  // Expose a test helper in the browser console: sentryTest()
  (window as any).sentryTest = () => {
    throw new Error('Sentry Web Dashboard debug error!');
  };
}

import './index.css';

import { sanitizeHtml, safeProp } from './utils/security';
import DOMPurify from 'dompurify';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CountryCode } from 'libphonenumber-js';

function validateAndFormatPhone(phoneNumber: string, defaultCountry: CountryCode = 'US'): { isValid: boolean; formatted: string } {
  try {
    const parsed = parsePhoneNumberFromString(phoneNumber, defaultCountry);
    if (parsed && parsed.isValid()) {
      return { isValid: true, formatted: parsed.format('E.164') };
    }
    return { isValid: false, formatted: phoneNumber };
  } catch (err) {
    return { isValid: false, formatted: phoneNumber };
  }
}

// ============================================================
// COUNTRY DATA FOR PHONE INPUT COMPONENT
// ============================================================

interface CountryEntry {
  code: CountryCode;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES: CountryEntry[] = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { code: 'AD', name: 'Andorra', dial: '+376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴' },
  { code: 'AG', name: 'Antigua & Barbuda', dial: '+1268', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', dial: '+374', flag: '🇦🇲' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', dial: '+994', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', dial: '+1242', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', dial: '+1246', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', dial: '+375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', dial: '+501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯' },
  { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia & Herzegovina', dial: '+387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', dial: '+673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮' },
  { code: 'KH', name: 'Cambodia', dial: '+855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'CV', name: 'Cape Verde', dial: '+238', flag: '🇨🇻' },
  { code: 'CF', name: 'Central African Republic', dial: '+236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', dial: '+235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', dial: '+269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', dial: '+243', flag: '🇨🇩' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺' },
  { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', dial: '+253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', dial: '+1767', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1809', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', dial: '+291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', dial: '+268', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', dial: '+679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', dial: '+995', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', dial: '+1473', flag: '🇬🇩' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', dial: '+224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', dial: '+509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', dial: '+1876', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', dial: '+686', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '+996', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', dial: '+266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', dial: '+218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { code: 'MR', name: 'Mauritania', dial: '+222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', dial: '+230', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', dial: '+377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', dial: '+976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', dial: '+674', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'KP', name: 'North Korea', dial: '+850', flag: '🇰🇵' },
  { code: 'MK', name: 'North Macedonia', dial: '+389', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts & Nevis', dial: '+1869', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', dial: '+1758', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent', dial: '+1784', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', dial: '+685', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', dial: '+378', flag: '🇸🇲' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', dial: '+248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', dial: '+677', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', dial: '+252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan', dial: '+211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', dial: '+249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', dial: '+597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', dial: '+963', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', dial: '+670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', dial: '+676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad & Tobago', dial: '+1868', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', dial: '+688', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', dial: '+678', flag: '🇻🇺' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'YE', name: 'Yemen', dial: '+967', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' }
];

// Per-instance state for which country is selected on each phone input
const _phoneCountryState = new Map<string, CountryCode>();

function getSelectedCountry(inputId: string): CountryEntry {
  const code = _phoneCountryState.get(inputId) || 'US';
  return COUNTRIES.find(c => c.code === code) || COUNTRIES.find(c => c.code === 'US')!;
}

function parseInitialPhone(value: string, defaultCountry: CountryCode = 'US'): { country: CountryCode; nationalNumber: string } {
  if (!value) return { country: defaultCountry, nationalNumber: '' };
  try {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed && parsed.country) {
      return { country: parsed.country, nationalNumber: parsed.nationalNumber as string };
    }
    const parsedDefault = parsePhoneNumberFromString(value, defaultCountry);
    if (parsedDefault && parsedDefault.isValid()) {
      return { country: defaultCountry, nationalNumber: parsedDefault.nationalNumber as string };
    }
  } catch (err) {
    // ignore
  }
  if (value.startsWith('+')) {
    for (const c of COUNTRIES) {
      if (value.startsWith(c.dial)) {
        return { country: c.code, nationalNumber: value.slice(c.dial.length).trim() };
      }
    }
  }
  return { country: defaultCountry, nationalNumber: value };
}

/**
 * Draws a premium phone input with a clickable flag + dial code button
 * that opens a searchable country dropdown.
 */
function drawPhoneInput(inputId: string, value: string = '', placeholder: string = 'Mobile number'): string {
  const parsed = parseInitialPhone(value, _phoneCountryState.get(inputId) || 'US');
  _phoneCountryState.set(inputId, parsed.country);
  const displayValue = parsed.nationalNumber;
  const country = getSelectedCountry(inputId);

  return `
    <div class="phone-input-wrapper" id="${inputId}-wrapper">
      <button type="button" class="phone-country-btn" id="${inputId}-country-btn" aria-label="Select country code">
        <span class="phone-flag">${country.flag}</span>
        <span class="phone-dial-code">${country.dial}</span>
        <svg class="phone-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <input type="tel" class="phone-number-input" id="${inputId}" value="${displayValue}" placeholder="${placeholder}" autocomplete="tel">
      <div class="phone-dropdown" id="${inputId}-dropdown">
        <div class="phone-dropdown-search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" class="phone-dropdown-search" id="${inputId}-search" placeholder="Search countries..." autocomplete="off">
        </div>
        <div class="phone-dropdown-list" id="${inputId}-list">
          ${COUNTRIES.map(c => `
            <button type="button" class="phone-dropdown-item ${c.code === country.code ? 'selected' : ''}" data-code="${c.code}">
              <span class="phone-dropdown-flag">${c.flag}</span>
              <span class="phone-dropdown-name">${c.name}</span>
              <span class="phone-dropdown-dial">${c.dial}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Binds interactive events for a phone input instance:
 * - Toggle dropdown on country button click
 * - Search/filter countries
 * - Select a country and close dropdown
 * - Close dropdown on outside click
 */
function bindPhoneInputEvents(inputId: string, onChange?: (fullNumber: string) => void) {
  const wrapper = document.getElementById(`${inputId}-wrapper`);
  const countryBtn = document.getElementById(`${inputId}-country-btn`);
  const dropdown = document.getElementById(`${inputId}-dropdown`);
  const searchInput = document.getElementById(`${inputId}-search`) as HTMLInputElement;
  const listContainer = document.getElementById(`${inputId}-list`);
  const phoneInput = document.getElementById(inputId) as HTMLInputElement;

  if (!wrapper || !countryBtn || !dropdown || !searchInput || !listContainer || !phoneInput) return;

  // Toggle dropdown
  countryBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    // Close all other open dropdowns first
    document.querySelectorAll('.phone-dropdown.open').forEach(d => d.classList.remove('open'));
    if (!isOpen) {
      dropdown.classList.add('open');
      searchInput.value = '';
      _filterPhoneList(listContainer, '');
      setTimeout(() => searchInput.focus(), 50);
    }
  });

  // Search filter
  searchInput.addEventListener('input', () => {
    _filterPhoneList(listContainer, searchInput.value);
  });

  // Prevent search input click from closing dropdown
  searchInput.addEventListener('click', (e) => e.stopPropagation());

  // Select country
  listContainer.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.phone-dropdown-item') as HTMLElement;
    if (!item) return;
    e.stopPropagation();

    const code = item.dataset.code as CountryCode;
    _phoneCountryState.set(inputId, code);

    const country = getSelectedCountry(inputId);

    // Update button display
    const flagEl = countryBtn.querySelector('.phone-flag');
    const dialEl = countryBtn.querySelector('.phone-dial-code');
    if (flagEl) flagEl.textContent = country.flag;
    if (dialEl) dialEl.textContent = country.dial;

    // Update selected state in list
    listContainer.querySelectorAll('.phone-dropdown-item').forEach(btn => btn.classList.remove('selected'));
    item.classList.add('selected');

    // Close dropdown
    dropdown.classList.remove('open');

    // Focus the phone input
    phoneInput.focus();

    if (onChange) onChange(country.dial + phoneInput.value);
  });

  // Close dropdown on outside click
  const outsideClickHandler = (e: MouseEvent) => {
    if (!wrapper.contains(e.target as Node)) {
      dropdown.classList.remove('open');
    }
  };
  document.addEventListener('click', outsideClickHandler);

  // Fire onChange on phone input
  if (onChange) {
    phoneInput.addEventListener('input', () => {
      const country = getSelectedCountry(inputId);
      onChange(country.dial + phoneInput.value);
    });
  }
}

function _filterPhoneList(listContainer: HTMLElement, query: string) {
  const q = query.toLowerCase().trim();
  const items = listContainer.querySelectorAll('.phone-dropdown-item');
  items.forEach(item => {
    const el = item as HTMLElement;
    const name = (el.querySelector('.phone-dropdown-name')?.textContent || '').toLowerCase();
    const dial = (el.querySelector('.phone-dropdown-dial')?.textContent || '').toLowerCase();
    if (!q || name.includes(q) || dial.includes(q)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// ============================================================
// TYPE & INTERFACES DEFINITIONS
// ============================================================

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  phone: string;
  status: 'active' | 'suspended' | 'terminated' | 'inactive';
  avatar?: string;
  location?: string;
  bio?: string;
  initials?: string;
  office?: string;
  performance?: number;
  tasks?: any[];
  leaves?: any[];
  queries?: any[];
  is_flagged?: boolean;
  linked_user?: number;
  finance?: any;
}

interface Client {
  id: number;
  company: string;
  contact: string; // Contact Representative Name (maps to "name" in web original)
  email: string;
  location?: string;
  status: 'active' | 'pending' | 'completed';
  lifetime_value: number; // Retainer value
  description?: string;
  remark?: string;
}

interface Project {
  id: number;
  name: string;
  client: number;
  client_name: string;
  status: 'active' | 'completed';
  progress: number;
  value: number;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
}

interface Debt {
  id: number;
  type: 'weOwe' | 'owedToUs';
  party: string;
  amount: number;
  due: string;
}

interface Budget {
  id: number;
  name: string;
  allocated: number;
  spent: number;
  color: string;
}

interface AppNotification {
  id: number;
  title: string;
  body: string;
  time: string;
}

interface AppState {
  view: 'splash' | 'tour' | 'login' | 'register' | 'complete-profile' | 'lock' | 'app' | 'offline' | 'forgot-password';
  isAuthenticated: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
    profile_complete: boolean;
    location?: string;
    phone?: string;
    bio?: string;
    social_link?: string;
    business_name?: string;
    org_location?: string;
    org_email?: string;
    company_line?: string;
    social_handles?: string;
    total_workers?: string;
    opening_time?: string;
    closing_time?: string;
    working_days?: string;
    average_revenue?: string;
    biometrics_enabled?: boolean;
    notifications_enabled?: boolean;
    company_logo?: string;
  } | null;
  authToken: string | null;
  activeTab: 'dashboard' | 'employees' | 'clients' | 'finance' | 'settings' | 'pricing' | 'chat';
  theme: 'light' | 'dark';
  isMobileSidebarOpen: boolean;
  isNotificationsOpen: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info'; visible: boolean } | null;
  chartRange: '7D' | '30D' | '12M';
  activeDebtTab: 'weOwe' | 'owedToUs';
  
  // Slide trackers
  activeTourSlide: number;
  completeProfileSlide: number;
  completeProfileData: any;
  
  // Registration and OTP flow
  registerStep: 'credentials' | 'otp';
  otpEmail: string;
  otpPassword: string;
  otpCountdown: number;
  otpTimer: any | null;
  otpValues: string[];
  
  // Forgot password & lockout suspension
  suspendedUntil: string | null;
  forgotStep: 'email' | 'otp' | 'new-password';
  forgotEmail: string;
  forgotCode: string;
  
  // Biometrics & lock screens
  isLockScreenActive: boolean;
  isScanning: boolean;
  lockError: string;

  // Django REST Metrics
  metrics: {
    employees: number;
    activeProjects: number;
    clients: number;
    netProfit: number;
    totalIncome: number;
    totalExpense: number;
  } | null;
  clientMetrics: {
    active: number;
    pending: number;
    completed: number;
    total: number;
  } | null;
  payrollMetrics: {
    paid: number;
    unpaid: number;
    staffPaid: number;
    total: number;
    payrollMonths: Array<{ month: string; paid: boolean }>;
  } | null;

  // Live Data lists
  employees: Employee[];
  clients: Client[];
  projects: Project[];
  transactions: Transaction[];
  notifications: AppNotification[];
  budgets: Budget[];
  debtsGrouped: {
    weOwe: Debt[];
    owedToUs: Debt[];
  } | null;
  branchMetrics: any[];
  subscriptionLimits: any | null;
  transactionCategories: any | null;
  dashboardAlerts: any | null;
  activityLogs: any[];

  // Chat state
  chatContacts: any[];
  chatMessages: any[];
  chatActiveContact: any | null;
  chatPollTimer: any | null;
  generalPollTimer: any | null;
}

// ============================================================
// APP STATE
// ============================================================

const state: AppState = {
  view: 'splash',
  isAuthenticated: false,
  user: null,
  authToken: localStorage.getItem('admin-suite.token'),
  activeTab: 'dashboard',
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  isMobileSidebarOpen: false,
  isNotificationsOpen: false,
  toast: null,
  chartRange: '7D',
  activeDebtTab: 'weOwe',
  
  activeTourSlide: 0,
  completeProfileSlide: 0,
  completeProfileData: null,
  
  registerStep: 'credentials',
  otpEmail: '',
  otpPassword: '',
  otpCountdown: 30,
  otpTimer: null,
  otpValues: Array(6).fill(''),
  
  suspendedUntil: localStorage.getItem('admin-suite.suspended-until'),
  forgotStep: 'email',
  forgotEmail: '',
  forgotCode: '',
  
  isLockScreenActive: false,
  isScanning: false,
  lockError: '',
  
  metrics: null,
  clientMetrics: null,
  payrollMetrics: null,
  debtsGrouped: null,
 
  employees: [],
  clients: [],
  projects: [],
  transactions: [],
  notifications: [],
  budgets: [],
 
  // Extended dashboard data
  branchMetrics: [],
  subscriptionLimits: null,
  transactionCategories: null,
  dashboardAlerts: null,
  activityLogs: [],
 
  // Chat
  chatContacts: [],
  chatMessages: [],
  chatActiveContact: null,
  chatPollTimer: null,
  generalPollTimer: null,
};

// Set theme attributes on bootstrap
document.documentElement.setAttribute('data-theme', state.theme);

// ============================================================
// SUPABASE AUTH CONFIGURATION (REST VIA FETCH)
// ============================================================

const SUPABASE_URL = 'https://whjxjqsxrnjpkoknfixo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoanhqcXN4cm5qcGtva25maXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjIxMTMsImV4cCI6MjA5NDg5ODExM30.sw6ac1XgIGZbXs9PJVhyliUSDGrkI1Cv6k4x02BcsE4';

async function supabaseSignUp(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.msg || err.message || 'Supabase account creation failed.');
  }
  const data = await response.json();
  if (data?.user?.identities?.length === 0) {
    throw new Error('An account with this email already exists.');
  }
  return data;
}

async function supabaseVerifyOTP(email: string, code: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, token: code, type: 'signup' })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.msg || err.message || 'Verification code is invalid or expired.');
  }
  return response.json();
}

async function supabaseResendOTP(email: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, type: 'signup' })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.msg || err.message || 'Failed to resend code.');
  }
}



// ============================================================
// DJANGO REST CLIENT
// ============================================================

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api/'
  : 'https://adminsuite-api.onrender.com/api/';

async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem('admin-suite.token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.append('Authorization', `Token ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.append('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('admin-suite.token');
    state.isAuthenticated = false;
    state.authToken = null;
    state.user = null;
    state.view = 'login';
    renderApp();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || err.message || JSON.stringify(err) || `Error ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Sync app database with live endpoints
async function syncAppData() {
  try {
    const [meRes, metricsRes, clientMetricsRes, payrollMetricsRes, debtsRes, empRes, cliRes, projRes, txRes, notifRes, budgRes] = await Promise.all([
      apiRequest('me/'),
      apiRequest('metrics/'),
      apiRequest('client-metrics/'),
      apiRequest('payroll-metrics/'),
      apiRequest('debts-grouped/'),
      apiRequest('employees/'),
      apiRequest('clients/'),
      apiRequest('projects/'),
      apiRequest('transactions/'),
      apiRequest('notifications/'),
      apiRequest('budgets/')
    ]);

    state.user = meRes;
    state.metrics = metricsRes;
    state.clientMetrics = clientMetricsRes;
    state.payrollMetrics = payrollMetricsRes;
    state.debtsGrouped = debtsRes;
    state.employees = empRes;
    state.clients = cliRes;
    state.projects = projRes;
    state.transactions = txRes;
    state.notifications = notifRes;
    state.budgets = budgRes;
    state.isAuthenticated = true;

    // Extended dashboard data — non-critical, fail silently
    try {
      const [branchRes, subRes, txCatRes, alertsRes] = await Promise.all([
        apiRequest('branch-metrics/'),
        apiRequest('subscription-limits/'),
        apiRequest('transaction-categories/'),
        apiRequest('dashboard-alerts/'),
      ]);
      state.branchMetrics = Array.isArray(branchRes) ? branchRes : [];
      state.subscriptionLimits = subRes || null;
      state.transactionCategories = txCatRes || null;
      state.dashboardAlerts = alertsRes || null;
    } catch (_e) {
      // Extended metrics unavailable — dashboard degrades gracefully
    }

    return true;
  } catch (err: any) {
    console.error('Failed to sync backend:', err);
    if (err.message && err.message.includes('Session expired')) {
      return false;
    }
    state.view = 'offline';
    renderApp();
    return false;
  }
}

// ============================================================
// ONBOARDING TOUR DATA
// ============================================================

const TOUR_SLIDES = [
  {
    title: 'One workspace<br/>for everything',
    body: 'All your tools and apps unified in a single, seamless environment.',
    image: '/slide1.png'
  },
  {
    title: 'Real-time<br/>financial clarity',
    body: 'Keep track of your finances with instant insights and metrics.',
    image: '/slide2.png'
  },
  {
    title: 'Roles built for<br/>real teams',
    body: 'Empower collaboration and assign responsibilities effortlessly.',
    image: '/slide3.png'
  },
  {
    title: 'Customize<br/>without code',
    body: 'Adapt your workflow with ease using simple drag-and-drop tools.',
    image: '/slide4.png'
  }
];

// ============================================================
// DASHBOARD INTERACTIVE TOUR STEPS
// ============================================================

const DASHBOARD_TOUR_STEPS = [
  {
    target: '[data-tab="dashboard"]',
    title: 'Dashboard',
    body: 'Your command center. View key business metrics, financial trends, and recent activity all in one glance.',
    position: 'right'
  },
  {
    target: '#tour-net-profit',
    title: 'Net Profit Overview',
    body: 'Track your monthly net profit in real-time. See income vs expenses at a glance, updated live from your records.',
    position: 'bottom'
  },
  {
    target: '#tour-stats-grid',
    title: 'Key Performance Metrics',
    body: 'Monitor your headcount, client portfolio, active projects, and income flow synced live with your database.',
    position: 'bottom'
  },
  {
    target: '[data-tab="employees"]',
    title: 'Employee Management',
    body: 'Manage your entire workforce. Add, edit, and track employee records, roles, departments, and compensation.',
    position: 'right'
  },
  {
    target: '[data-tab="clients"]',
    title: 'Client Portfolio',
    body: 'Your client relationship hub. Track retainer values, project assignments, and manage client statuses.',
    position: 'right'
  },
  {
    target: '[data-tab="finance"]',
    title: 'Financial Control',
    body: 'Complete financial oversight. Monitor transactions, manage budgets, track debts, and export reports.',
    position: 'right'
  },
  {
    target: '#tour-quick-actions',
    title: 'Quick Operations',
    body: 'Instantly add new staff, onboard clients, log expenses, or jump to settings with a single click.',
    position: 'top'
  },
  {
    target: '#theme-toggle-btn',
    title: 'Theme Toggle',
    body: 'Switch between light and dark modes for comfortable viewing. Your preference is saved automatically.',
    position: 'bottom'
  },
  {
    target: '#notification-dropdown-btn',
    title: 'Notifications Center',
    body: 'Stay informed with real-time announcements, system alerts, and important workspace updates.',
    position: 'bottom'
  },
  {
    target: '[data-tab="settings"]',
    title: 'Profile & Settings',
    body: 'Personalize your workspace. Update your admin profile, enable biometric security, and manage data exports.',
    position: 'right'
  }
];

// ============================================================
// WIZARD CONFIG
// ============================================================

const HEARD_FROM_OPTIONS = [
  { value: 'youtube', label: 'YouTube', icon: '▶', color: '#ef4444' },
  { value: 'tiktok', label: 'TikTok', icon: '♪', color: '#00f2fe' },
  { value: 'facebook', label: 'Facebook & Socials', icon: 'f', color: '#1877f2' },
  { value: 'friend', label: 'A Friend / Colleague', icon: '👤', color: '#10b981' },
  { value: 'others', label: 'Other Sources', icon: '•••', color: '#6366f1' }
];

const ROLE_OPTIONS = [
  {
    value: 'admin',
    title: 'Company Administrator',
    desc: 'Manage finances, assign budgets, set up integrations, and view full workspace metrics.',
    icon: '🛡️'
  },
  {
    value: 'hr',
    title: 'HR & People Manager',
    desc: 'Oversee employee onboarding, track leave requests, manage initials, performance and shares.',
    icon: '👥'
  },
  {
    value: 'manager',
    title: 'Project / Team Lead',
    desc: 'Manage client deliverables, track ongoing projects, assign tasks, and coordinate with clients.',
    icon: '💼'
  }
];

// ============================================================
// ICON DICTIONARY (Feather SVGs)
// ============================================================

const ICONS = new Map<string, string>([
  ['grid', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`],
  ['users', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`],
  ['briefcase', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`],
  ['trending-up', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`],
  ['user', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`],
  ['settings', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`],
  ['bell', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`],
  ['sun', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`],
  ['moon', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`],
  ['shield', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`],
  ['search', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`],
  ['plus', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`],
  ['trash', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`],
  ['menu', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`],
  ['log-out', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`],
  ['download', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`],
  ['x', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`],
  ['alert', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`],
  ['check', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`],
  ['info', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`],
  ['chevron', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`],
  ['lock', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`],
  ['mail', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`],
  ['eye', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`],
  ['eye-off', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`],
  ['wifi-off', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"></path><path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.5 8"></path><path d="M1.5 8a16 16 0 0 1 7.72-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>`],
  ['message-circle', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`],
  ['send', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`],
  ['building', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`],
  ['clipboard', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`],
  ['dollar-sign', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`],
  ['calendar', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`],
  ['activity', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`]
]);

function getIconSvg(name: string, className = ''): string {
  const raw = ICONS.get(name) || ICONS.get('info')!;
  if (className) {
    return raw.replace('<svg ', `<svg class="${className}" `);
  }
  return raw;
}

// LogoMark using mask-image with the unified triangle-wedge logo PNG
function getLogoMarkSvg(size = 56, color = 'currentColor'): string {
  return `
    <span style="display: block; width: ${size}px; height: ${size}px; background-color: ${color}; -webkit-mask: url(/logo.png) no-repeat center / contain; mask: url(/logo.png) no-repeat center / contain;"></span>
  `;
}

// ============================================================
// TOAST BANNER ALERTS
// ============================================================

function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  state.toast = { message, type, visible: true };
  renderToast();
  
  setTimeout(() => {
    if (state.toast && state.toast.message === message) {
      state.toast.visible = false;
      const el = document.getElementById('toast-notification');
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateX(40px)';
        setTimeout(() => el.remove(), 400);
      }
    }
  }, 3500);
}

function renderToast() {
  if (!state.toast || !state.toast.visible) return;
  
  let existing = document.getElementById('toast-notification');
  if (existing) existing.remove();
  
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toast-notification';
  toastContainer.className = `toast ${state.toast.type}`;
  
  const iconName = state.toast.type === 'success' ? 'check' : state.toast.type === 'error' ? 'alert' : 'info';
  
toastContainer.innerHTML = DOMPurify.sanitize(`
    ${getIconSvg(iconName, 'toast-icon')}
    <span>${sanitizeHtml(state.toast.message)}</span>
`);
  
  document.body.appendChild(toastContainer);
}

// ============================================================
// CURRENCY FORMATTER
// ============================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================================
// VIEW NAVIGATION CONTROLLER
// ============================================================

function navigateToTab(tab: typeof state.activeTab) {
  // End dashboard tour if navigating away
  if (dashboardTourStep >= 0 && tab !== 'dashboard') {
    endDashboardTour();
  }
  if (state.chatPollTimer && tab !== 'chat') {
    clearInterval(state.chatPollTimer);
    state.chatPollTimer = null;
  }
  state.activeTab = tab;
  state.isMobileSidebarOpen = false;
  
  window.history.pushState(null, '', `#/${tab}`);
  renderApp();
}

window.addEventListener('hashchange', () => {
  if (state.view !== 'app') return;
  const hash = window.location.hash.slice(2);
  const validTabs: Array<typeof state.activeTab> = ['dashboard', 'employees', 'clients', 'finance', 'settings', 'chat'];
  if (validTabs.includes(hash as any)) {
    navigateToTab(hash as any);
  }
});

// ============================================================
// SCREEN TEMPLATE DRAWERS
// ============================================================

// Track previous view so we can do partial updates when staying in the same view
let _prevView: AppState['view'] | null = null;

export function renderApp() {
  const root = document.getElementById('root');
  if (!root) return;

  // Manage general app data polling (real-time updates)
  if (state.view === 'app') {
    if (!state.generalPollTimer) {
      state.generalPollTimer = setInterval(async () => {
        if (state.isAuthenticated && state.view === 'app') {
          const ok = await syncAppData();
          if (ok) {
            renderApp();
          }
        }
      }, 3000);
    }
  } else {
    if (state.generalPollTimer) {
      clearInterval(state.generalPollTimer);
      state.generalPollTimer = null;
    }
  }

  if (state.suspendedUntil && new Date(state.suspendedUntil) > new Date()) {
    root.innerHTML = DOMPurify.sanitize(drawSuspended());
    bindSuspendedEvents();
    return;
  }

  // Global theme check
  document.documentElement.setAttribute('data-theme', state.theme);

  // Clean up dashboard tour overlay on re-render (appended to body, not root)
  const tourOverlayCleanup = document.getElementById('dashboard-tour-overlay');
  if (tourOverlayCleanup) tourOverlayCleanup.remove();

  // ── PARTIAL UPDATE: If we're already in the 'app' view and the view
  //    hasn't changed, selectively update only the parts that changed
  //    instead of nuking the entire DOM (which causes visible flashing). ──
  if (state.view === 'app' && _prevView === 'app') {
    _patchAppView();
    return;
  }

  _prevView = state.view;

  switch (state.view as string) {
    case 'splash':
      root.innerHTML = DOMPurify.sanitize(drawSplashGate());
      bindSplashEvents();
      break;
    case 'tour':
      root.innerHTML = DOMPurify.sanitize(drawTour());
      bindTourEvents();
      break;
    case 'login':
      root.innerHTML = DOMPurify.sanitize(drawLogin());
      bindLoginEvents();
      break;
    case 'forgot-password':
      root.innerHTML = DOMPurify.sanitize(drawForgotPassword());
      bindForgotPasswordEvents();
      break;
    case 'register':
      root.innerHTML = DOMPurify.sanitize(drawRegister());
      bindRegisterEvents();
      break;
    case 'complete-profile':
      root.innerHTML = DOMPurify.sanitize(drawCompleteProfile());
      bindCompleteProfileEvents();
      break;
    case 'lock':
      root.innerHTML = DOMPurify.sanitize(drawLockScreen());
      bindLockEvents();
      break;
    case 'offline':
      root.innerHTML = DOMPurify.sanitize(drawOfflineScreen());
      bindOfflineEvents();
      break;
    case 'app':
      root.innerHTML = DOMPurify.sanitize(`
        <div class="app-layout">
          <div id="sidebar-overlay" class="sidebar-overlay ${state.isMobileSidebarOpen ? 'open' : ''}"></div>
          ${drawSidebar()}
          <div class="main-content">
            ${drawTopbar()}
            <main class="page-content page-content-animate">
              ${drawTabContent()}
            </main>
          </div>
          <div id="modal-container"></div>
        </div>
      `);
      bindNavigationEvents();
      bindTabSpecificEvents();
      break;
  }
}

/**
 * Performs an in-place partial DOM update when already in the 'app' view.
 * Instead of replacing the entire root.innerHTML (which tears down and
 * rebuilds the whole DOM causing a visible blink), this only patches:
 *   1. Sidebar active-tab highlights
 *   2. The page-content area (the main tab body)
 *   3. The topbar notification dropdown state
 *   4. The sidebar overlay for mobile
 */
function _patchAppView() {
  // 1. Update page content (the main area that changes on tab switch)
  const pageContent = document.querySelector('.page-content');
  if (pageContent) {
    pageContent.innerHTML = DOMPurify.sanitize(drawTabContent());
    // 3D Spring View Switch Animation Reset
    pageContent.classList.remove('page-content-animate');
    void (pageContent as HTMLElement).offsetWidth; // Trigger layout reflow
    pageContent.classList.add('page-content-animate');
  }

  // 2. Update sidebar active states
  document.querySelectorAll('.nav-item').forEach(btn => {
    const tab = (btn as HTMLElement).dataset.tab;
    if (tab === state.activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 3. Update sidebar overlay (mobile)
  const overlay = document.getElementById('sidebar-overlay');
  if (overlay) {
    if (state.isMobileSidebarOpen) {
      overlay.classList.add('open');
    } else {
      overlay.classList.remove('open');
    }
  }

  // 4. Update sidebar mobile open/close
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    if (state.isMobileSidebarOpen) {
      sidebar.classList.add('open');
    } else {
      sidebar.classList.remove('open');
    }
  }

  // 5. Update notification dropdown
  const notifPanel = document.querySelector('.notification-panel');
  if (notifPanel) {
    if (state.isNotificationsOpen) {
      notifPanel.classList.add('show');
    } else {
      notifPanel.classList.remove('show');
    }
  }

  // 6. Update topbar (for notification badge, theme icon, etc.)
  const topbar = document.querySelector('.topbar');
  if (topbar && topbar.parentElement) {
    const temp = document.createElement('div');
    temp.innerHTML = DOMPurify.sanitize(drawTopbar());
    const newTopbar = temp.firstElementChild;
    if (newTopbar) {
      topbar.parentElement.replaceChild(newTopbar, topbar);
    }
  }

  // Re-bind events since inner content changed
  bindNavigationEvents();
  bindTabSpecificEvents();
}

// ------------------------------------------------------------
// 1. SPLASH SCREEN (PRELOADER)
// ------------------------------------------------------------

function drawSplashGate(): string {
  return `
    <div class="splash-gate">
      <div class="mark-ring">
        ${getLogoMarkSvg(100, 'var(--foreground)')}
      </div>
      <div class="splash-title">Admin Suite</div>
      <div class="splash-tagline">Run the entire company</div>
      
      <div class="dot-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div class="powered-footer">
        Powered by <span class="brand-dima">Dima</span><span class="brand-code">Code</span>
      </div>
    </div>
  `;
}

let splashTimerRegistered = false;
function bindSplashEvents() {
  if (splashTimerRegistered) return;
  splashTimerRegistered = true;

  setTimeout(async () => {
    splashTimerRegistered = false;
    const tourComplete = localStorage.getItem('admin-suite.tour-complete') === 'true';
    
    if (!tourComplete) {
      state.view = 'tour';
      renderApp();
      return;
    }

    if (!state.authToken) {
      state.view = 'login';
      renderApp();
      return;
    }

    // Attempt token validation & data sync
    const ok = await syncAppData();
    if (ok) {
      if (state.user && !state.user.profile_complete) {
        state.view = 'complete-profile';
      } else if (state.user?.biometrics_enabled) {
        state.view = 'lock';
      } else {
        state.view = 'app';
      }
      renderApp();
    }
  }, 1900);
}

// ------------------------------------------------------------
// 2. TOUR ONBOARDING SCREEN
// ------------------------------------------------------------

function drawTour(): string {
  const slide = TOUR_SLIDES.at(state.activeTourSlide)!;
  
  const dotsHtml = TOUR_SLIDES.map((_, i) => `
    <span class="tour-dot ${i === state.activeTourSlide ? 'active' : ''}" 
          style="width: ${i === state.activeTourSlide ? '20px' : '8px'};"></span>
  `).join('');

  return `
    <div class="tour-container">
      <div class="tour-card">
        <div class="tour-illustration">
          <img src="${slide.image}" alt="Tour Onboarding illustration" />
        </div>
        
        <div class="tour-dots">
          ${dotsHtml}
        </div>
        
        <h1 class="tour-title">${slide.title}</h1>
        <p class="tour-body">${slide.body}</p>
        
        <div class="tour-footer">
          <button class="btn btn-ghost" id="tour-skip-btn">SKIP</button>
          <button class="btn btn-primary" id="tour-next-btn">
            ${state.activeTourSlide === TOUR_SLIDES.length - 1 ? 'START' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindTourEvents() {
  const nextBtn = document.getElementById('tour-next-btn');
  const skipBtn = document.getElementById('tour-skip-btn');

  const completeTour = () => {
    localStorage.setItem('admin-suite.tour-complete', 'true');
    state.view = 'register';
    renderApp();
  };

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.activeTourSlide < TOUR_SLIDES.length - 1) {
        state.activeTourSlide++;
        renderApp();
      } else {
        completeTour();
      }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', completeTour);
  }
}

// ------------------------------------------------------------
// 3. LOGIN SCREEN
// ------------------------------------------------------------

function drawAuthLeftPanel(): string {
  return `
    <div class="split-left-panel">
      <div class="split-brand-row">
        <div style="background:rgba(255,255,255,0.15); padding:6px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
          ${getLogoMarkSvg(24, '#ffffff')}
        </div>
        <span class="split-brand-text">AdminSuite</span>
      </div>
      
      <div>
        <h1 class="split-hero-title">Manage Smarter.<br/>Grow Faster.<br/>Scale Anywhere.</h1>
        <p class="split-hero-sub">A centralized control center to manage your employees, clients, projects, and finances seamlessly in one beautiful platform.</p>
      </div>
      
      <div style="font-size:11px; opacity:0.6; font-weight:500;">
        Powered by <span style="font-weight:700;">Dima</span><span style="color:var(--accent); font-weight:700;">Code</span>
      </div>
    </div>
  `;
}

function drawLogin(): string {
  return `
    <div class="login-page">
      <div class="split-container">
        ${drawAuthLeftPanel()}
        <div class="split-right-panel">
          <div class="login-logo" style="text-align: left; margin-bottom: 24px;">
            <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Sign In</h1>
            <p style="color: var(--muted-foreground); font-size: 14px; margin-top: 4px;">Enter your email and password to access your account</p>
          </div>
          
          <form id="login-form">
            <div class="form-group" style="position: relative;">
              <label class="form-label" for="login-email">Email Address</label>
              <div style="position: relative; display: flex; align-items: center;">
                <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
                  ${getIconSvg('mail', 'form-icon')}
                </span>
                <input class="form-input" type="email" id="login-email" required placeholder="Email address" style="padding-left: 38px;" value="admin@adminsuite.app">
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 20px;">
              <label class="form-label" for="login-password">Password</label>
              <div style="position: relative; display: flex; align-items: center;">
                <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
                  ${getIconSvg('lock', 'form-icon')}
                </span>
                <input class="form-input" type="password" id="login-password" required placeholder="Password" style="padding-left: 38px; padding-right: 40px;">
                <button type="button" id="login-pwd-toggle" style="position: absolute; right: 12px; background: none; border: none; color: var(--muted-foreground); display: flex;">
                  ${getIconSvg('eye')}
                </button>
              </div>
            </div>
            
            <div style="text-align: right; margin-bottom: 20px;">
              <a href="#" id="forgot-password-link" style="font-size: 13px; font-weight: 500;">Forgot password?</a>
            </div>
            
            <button type="submit" class="login-btn" id="login-submit-btn">Continue</button>
          </form>
          
          <div class="divider" style="display:flex; align-items:center; margin: 24px 0; color: var(--muted-foreground); font-size:12px;">
            <div style="flex:1; height:1px; background:var(--border);"></div>
            <span style="padding: 0 10px;">Don't have an account yet?</span>
            <div style="flex:1; height:1px; background:var(--border);"></div>
          </div>

          <button class="btn btn-outline" id="goto-register-btn" style="width: 100%;">Create an account</button>
        </div>
      </div>
    </div>
  `;
}

function bindLoginEvents() {
  const form = document.getElementById('login-form') as HTMLFormElement;
  const togglePwd = document.getElementById('login-pwd-toggle');
  const pwdInput = document.getElementById('login-password') as HTMLInputElement;
  const gotoRegBtn = document.getElementById('goto-register-btn');
  const forgotLink = document.getElementById('forgot-link');
  if (togglePwd && pwdInput) {
    togglePwd.addEventListener('click', () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      togglePwd.innerHTML = DOMPurify.sanitize(getIconSvg(isPwd ? 'eye-off' : 'eye'));
    });
  }

  if (gotoRegBtn) {
    gotoRegBtn.addEventListener('click', () => {
      state.view = 'register';
      state.registerStep = 'credentials';
      renderApp();
    });
  }

  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      state.view = 'forgot-password';
      state.forgotStep = 'email';
      renderApp();
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email') as HTMLInputElement;
      const submitBtn = document.getElementById('login-submit-btn') as HTMLButtonElement;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="dot-loader" style="margin: 0; gap: 4px;"><span style="width:6px;height:6px;"></span><span style="width:6px;height:6px;"></span><span style="width:6px;height:6px;"></span></span>';

      try {
        // Authenticate with Django REST
        const response = await fetch(`${API_BASE}token-auth/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: emailInput.value.trim().toLowerCase(), password: pwdInput.value })
        });

        if (!response.ok) {
          let errMsg = 'Invalid login credentials. Please try again.';
          try {
            const errData = await response.json();
            if (response.status === 423 || errData.error === 'suspended') {
              state.suspendedUntil = errData.suspended_until;
              if (errData.suspended_until) {
                localStorage.setItem('admin-suite.suspended-until', errData.suspended_until);
              }
              showToast(errData.message || 'Account suspended.', 'error');
              renderApp();
              return;
            }
            if (errData.message) {
              errMsg = errData.message;
            }
          } catch (_) {}
          throw new Error(errMsg);
        }

        const authData = await response.json();
        localStorage.setItem('admin-suite.token', authData.token);
        state.authToken = authData.token;

        const synced = await syncAppData();
        if (synced) {
          showToast('Signed in successfully!', 'success');
          if (state.user && !state.user.profile_complete) {
            state.view = 'complete-profile';
          } else if (state.user?.biometrics_enabled) {
            state.view = 'lock';
          } else {
            state.view = 'app';
          }
          renderApp();
        } else {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Continue';
        }
      } catch (err: any) {
        showToast(err.message || 'Login failed', 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Continue';
      }
    });
  }
}

// ------------------------------------------------------------
// 4. REGISTRATION SCREEN (WITH OTP HANDLERS)
// ------------------------------------------------------------

function drawRegister(): string {
  if (state.registerStep === 'credentials') {
    return `
      <div class="login-page">
        <div class="split-container">
          ${drawAuthLeftPanel()}
          <div class="split-right-panel">
            <div class="login-logo" style="text-align: left; margin-bottom: 24px;">
              <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Create Account</h1>
              <p style="color: var(--muted-foreground); font-size: 14px; margin-top: 4px;">Join Admin Suite and start running your company</p>
            </div>
            
            <form id="register-form">
              <div class="form-group">
                <label class="form-label" for="reg-email">Email Address</label>
                <div style="position: relative; display: flex; align-items: center;">
                  <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
                    ${getIconSvg('mail', 'form-icon')}
                  </span>
                  <input class="form-input" type="email" id="reg-email" required placeholder="Enter corporate email" style="padding-left: 38px;">
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="reg-password">Password</label>
                <div style="position: relative; display: flex; align-items: center;">
                  <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
                    ${getIconSvg('lock', 'form-icon')}
                  </span>
                  <input class="form-input" type="password" id="reg-password" required placeholder="Minimum 8 characters" style="padding-left: 38px; padding-right: 40px;">
                  <button type="button" id="reg-pwd-toggle" style="position: absolute; right: 12px; background: none; border: none; color: var(--muted-foreground); display: flex;">
                    ${getIconSvg('eye')}
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label" for="reg-confirm">Confirm Password</label>
                <div style="position: relative; display: flex; align-items: center;">
                  <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
                    ${getIconSvg('lock', 'form-icon')}
                  </span>
                  <input class="form-input" type="password" id="reg-confirm" required placeholder="Verify password" style="padding-left: 38px;">
                </div>
              </div>
              
              <button type="submit" class="login-btn" id="reg-submit-btn">Continue</button>
            </form>
            
            <div class="divider" style="display:flex; align-items:center; margin: 24px 0; color: var(--muted-foreground); font-size:12px;">
              <div style="flex:1; height:1px; background:var(--border);"></div>
              <span style="padding: 0 10px;">Already have an account?</span>
              <div style="flex:1; height:1px; background:var(--border);"></div>
            </div>

            <button class="btn btn-outline" id="goto-login-btn" style="width: 100%;">Sign in</button>
          </div>
        </div>
      </div>
    `;
  } else {
    // OTP entry view (6 boxes)
    const boxes = Array(6).fill(0).map((_, i) => `
      <input type="text" maxlength="1" class="otp-box" data-index="${i}" value="${state.otpValues.at(i) || ''}" pattern="[0-9]*" inputmode="numeric">
    `).join('');

    const padZero = (n: number) => n < 10 ? '0' + n : n;
    const mins = Math.floor(state.otpCountdown / 60);
    const secs = state.otpCountdown % 60;

    return `
      <div class="login-page">
        <div class="split-container">
          ${drawAuthLeftPanel()}
          <div class="split-right-panel" style="text-align: center;">
            <div class="login-logo" style="text-align: center; margin-bottom: 24px;">
              <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Verify OTP</h1>
              <p style="color: var(--muted-foreground); font-size: 14px; margin-top: 4px;">Enter the 6-digit verification code sent to<br/><strong>${sanitizeHtml(state.otpEmail)}</strong></p>
            </div>
            
            <div class="otp-container">
              ${boxes}
            </div>
            
            <div style="margin: 20px 0; font-size: 13px; color: var(--muted-foreground);">
              ${state.otpCountdown > 0 
                ? `Resend code in <span style="font-weight:600; color:var(--foreground);">${padZero(mins)}:${padZero(secs)}</span>`
                : `<button class="btn-ghost" id="resend-otp-btn" style="text-decoration:underline; font-weight:600; color:var(--accent);">Resend verification code</button>`
              }
            </div>
            
            <button class="login-btn" id="verify-otp-btn" style="margin-top: 10px;">Verify Code</button>
            <button class="btn btn-ghost" id="back-to-credentials-btn" style="width:100%; margin-top: 12px;">Back</button>
          </div>
        </div>
      </div>
    `;
  }
}

function bindRegisterEvents() {
  if (state.registerStep === 'credentials') {
    const form = document.getElementById('register-form') as HTMLFormElement;
    const togglePwd = document.getElementById('reg-pwd-toggle');
    const pwdInput = document.getElementById('reg-password') as HTMLInputElement;
    const confirmInput = document.getElementById('reg-confirm') as HTMLInputElement;
    const gotoLogin = document.getElementById('goto-login-btn');

    if (togglePwd && pwdInput) {
      togglePwd.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        togglePwd.innerHTML = DOMPurify.sanitize(getIconSvg(isPwd ? 'eye-off' : 'eye'));
      });
    }

    if (gotoLogin) {
      gotoLogin.addEventListener('click', () => {
        state.view = 'login';
        renderApp();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('reg-email') as HTMLInputElement;
        const submitBtn = document.getElementById('reg-submit-btn') as HTMLButtonElement;

        const email = emailInput.value.trim().toLowerCase();
        const pwd = pwdInput.value;
        const confirm = confirmInput.value;

        if (pwd.length < 8) {
          showToast('Password must be at least 8 characters long', 'error');
          return;
        }
        if (pwd !== confirm) {
          showToast('Passwords do not match', 'error');
          return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="dot-loader" style="margin: 0; gap: 4px;"><span style="width:6px;height:6px;"></span><span style="width:6px;height:6px;"></span><span style="width:6px;height:6px;"></span></span>';

        try {
          // 1. SignUp with Supabase to trigger OTP verification email
          await supabaseSignUp(email, pwd);

          state.otpEmail = email;
          state.otpPassword = pwd;
          state.registerStep = 'otp';
          state.otpCountdown = 30;
          state.otpValues = Array(6).fill('');
          
          startOTPTimer();
          renderApp();
          showToast('Verification code dispatched to your email!', 'success');
        } catch (err: any) {
          showToast(err.message || 'Registration failed', 'error');
          submitBtn.disabled = false;
          submitBtn.innerText = 'Continue';
        }
      });
    }
  } else {
    // OTP Bindings
    const otpBoxes = document.querySelectorAll('.otp-box') as NodeListOf<HTMLInputElement>;
    const verifyBtn = document.getElementById('verify-otp-btn');
    const backBtn = document.getElementById('back-to-credentials-btn');
    const resendBtn = document.getElementById('resend-otp-btn');

    // Auto-focus first input
    const firstBox = document.querySelector('.otp-box[data-index="0"]') as HTMLInputElement;
    if (firstBox) firstBox.focus();

    otpBoxes.forEach(box => {
      box.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.dataset.index || '0');
        const val = target.value.replace(/[^0-9]/g, '');
        target.value = val;
        
        state.otpValues.splice(idx, 1, val);

        if (val && idx < 5) {
          const next = document.querySelector(`.otp-box[data-index="${idx + 1}"]`) as HTMLInputElement;
          if (next) next.focus();
        }
      });

      box.addEventListener('keydown', (e) => {
        const target = e.target as HTMLInputElement;
        const idx = parseInt(target.dataset.index || '0');
        
        if (e.key === 'Backspace' && !target.value && idx > 0) {
          const prev = document.querySelector(`.otp-box[data-index="${idx - 1}"]`) as HTMLInputElement;
          if (prev) {
            prev.focus();
            prev.value = '';
            state.otpValues.splice(idx - 1, 1, '');
          }
        }
      });
    });

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        clearInterval(state.otpTimer);
        state.registerStep = 'credentials';
        renderApp();
      });
    }

    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        try {
          await supabaseResendOTP(state.otpEmail);
          state.otpCountdown = 30;
          startOTPTimer();
          renderApp();
          showToast('Verification code resent!', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to resend code', 'error');
        }
      });
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', async () => {
        const code = state.otpValues.join('');
        if (code.length < 6) {
          showToast('Please enter the complete 6-digit code', 'error');
          return;
        }

        verifyBtn.setAttribute('disabled', 'true');
        verifyBtn.innerText = 'Verifying...';

        try {
          // 2. Verify code on Supabase
          await supabaseVerifyOTP(state.otpEmail, code);

          // 3. Register user on Django backend
          const signupRes = await apiRequest('register/', {
            method: 'POST',
            body: JSON.stringify({
              email: state.otpEmail,
              password: state.otpPassword,
              confirm_password: state.otpPassword,
              supabase_verified: true
            })
          });

          clearInterval(state.otpTimer);
          localStorage.setItem('admin-suite.token', signupRes.token);
          state.authToken = signupRes.token;

          const synced = await syncAppData();
          if (synced) {
            showToast('Registration verified & completed!', 'success');
            state.view = 'complete-profile';
            state.completeProfileSlide = 0;
            renderApp();
          } else {
            verifyBtn.removeAttribute('disabled');
            verifyBtn.innerText = 'Verify Code';
          }
        } catch (err: any) {
          showToast(err.message || 'Verification failed', 'error');
          verifyBtn.removeAttribute('disabled');
          verifyBtn.innerText = 'Verify Code';
        }
      });
    }
  }
}

function startOTPTimer() {
  if (state.otpTimer) clearInterval(state.otpTimer);
  state.otpTimer = setInterval(() => {
    if (state.otpCountdown > 0) {
      state.otpCountdown--;
      const span = document.querySelector('.otp-card span');
      if (span) {
        const padZero = (n: number) => n < 10 ? '0' + n : n;
        const mins = Math.floor(state.otpCountdown / 60);
        const secs = state.otpCountdown % 60;
        span.innerHTML = DOMPurify.sanitize(`${padZero(mins)}:${padZero(secs)}`);
      }
      if (state.otpCountdown === 0) {
        clearInterval(state.otpTimer);
        renderApp();
      }
    }
  }, 1000);
}

// ------------------------------------------------------------
// 5. COMPLETE PROFILE WIZARD (7 SLIDES)
// ------------------------------------------------------------

function drawCompleteProfile(): string {
  const stepPct = Math.round((state.completeProfileSlide / 6) * 100);
  
  return `
    <div class="wizard-container">
      <div class="wizard-card">
        <div class="wizard-header">
          <div class="wizard-header-top">
            <span class="wizard-step-info">Slide ${state.completeProfileSlide + 1} of 7</span>
            <span style="font-weight:600; font-size:12px;">${stepPct}% Completed</span>
          </div>
          <div class="wizard-progress-bar">
            <div class="wizard-progress-fill" style="width: ${stepPct}%;"></div>
          </div>
        </div>
        
        <div class="wizard-body">
          ${drawCompleteProfileSlideBody()}
        </div>
        
        <div class="wizard-footer">
          <button class="btn btn-outline" id="wiz-back-btn" ${state.completeProfileSlide === 0 ? 'disabled style="opacity:0.5; cursor:default;"' : ''}>Back</button>
          <button class="btn btn-primary" id="wiz-next-btn">
            ${state.completeProfileSlide === 6 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function drawCompleteProfileSlideBody(): string {
  const d = state.completeProfileData || {};

  switch (state.completeProfileSlide) {
    case 0: // Discovery Source
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">How did you find us?</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Please select how you heard about Admin Suite to help us scale.</p>
        <div class="option-select-grid">
          ${HEARD_FROM_OPTIONS.map(opt => `
            <div class="option-select-card ${d.heard_from === opt.value ? 'selected' : ''}" data-value="${opt.value}">
              <div class="option-select-icon" style="background:${opt.color}15; color:${opt.color};">${opt.icon}</div>
              <div class="option-select-text">
                <div class="option-select-title">${opt.label}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    
    case 1: // Role Selection
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Choose your workspace role</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Select the title that best describes your workspace responsibilities.</p>
        <div class="option-select-grid">
          ${ROLE_OPTIONS.map(opt => `
            <div class="option-select-card ${d.role === opt.value ? 'selected' : ''}" data-value="${opt.value}">
              <div class="option-select-icon" style="background:rgba(37,99,235,0.08); font-size:22px;">${opt.icon}</div>
              <div class="option-select-text">
                <div class="option-select-title">${opt.title}</div>
                <div class="option-select-desc">${opt.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

    case 2: // Personal Details
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Personal details</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Complete your user profile card to personalize notifications.</p>
        
        <div class="form-group">
          <label class="form-label" for="cp-name">Full Name</label>
          <input type="text" class="form-input" id="cp-name" value="${sanitizeHtml(d.name || '')}" placeholder="Jane Doe" required>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="cp-location">Personal Location</label>
          <input type="text" class="form-input" id="cp-location" value="${sanitizeHtml(d.location || '')}" placeholder="London, UK" required>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="cp-phone">Contact Phone</label>
          ${drawPhoneInput('cp-phone', d.phone || '', 'e.g. 7911 123456')}
        </div>

        <div class="form-group">
          <label class="form-label" for="cp-bio">Brief Bio</label>
          <textarea class="form-input" id="cp-bio" rows="3" placeholder="Describe your corporate objectives...">${d.bio || ''}</textarea>
        </div>
      `;

    case 3: // Business Profile
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Organization Profile</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Provide details about your corporate structure (Optional).</p>
        
        <div class="form-group">
          <label class="form-label" for="cp-biz-name">Business Legal Name</label>
          <input type="text" class="form-input" id="cp-biz-name" value="${d.business_name || ''}" placeholder="Enterprise Corp">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="cp-org-location">Corporate Headquarters</label>
            <input type="text" class="form-input" id="cp-org-location" value="${d.org_location || ''}" placeholder="New York, USA">
          </div>
          <div class="form-group">
            <label class="form-label" for="cp-org-email">Corporate Email Address</label>
            <input type="email" class="form-input" id="cp-org-email" value="${d.org_email || ''}" placeholder="hq@enterprise.com">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="cp-workers">Staff Size</label>
            <input type="text" class="form-input" id="cp-workers" value="${d.total_workers || ''}" placeholder="10 - 50 staff">
          </div>
          <div class="form-group">
            <label class="form-label" for="cp-revenue">Average Yearly Revenue</label>
            <input type="text" class="form-input" id="cp-revenue" value="${d.average_revenue || ''}" placeholder="$2M - $5M">
          </div>
        </div>
      `;

    case 4: // Simulated Biometrics
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Security Gateways</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Activate simulated biometrics to lock/unlock Admin Suite workspace console.</p>
        
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 20px; background: var(--muted); border-radius:var(--radius-sm); border:1px solid var(--border);">
          <div>
            <span style="font-weight:700; font-size:14px; display:block;">Enable Biometric Screenlock</span>
            <span style="font-size:11px; color:var(--muted-foreground);">Prompt simulated biometric check when opening this dashboard tab.</span>
          </div>
          <input type="checkbox" id="cp-biometrics" ${d.biometrics_enabled ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
        </div>
      `;

    case 5: // Notifications
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Workspace Announcements</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Activate dashboard notifications to sync with server events.</p>
        
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 20px; background: var(--muted); border-radius:var(--radius-sm); border:1px solid var(--border);">
          <div>
            <span style="font-weight:700; font-size:14px; display:block;">Enable Live Alerts</span>
            <span style="font-size:11px; color:var(--muted-foreground);">Get system events, payment receipts, and security announcements.</span>
          </div>
          <input type="checkbox" id="cp-notifications" ${d.notifications_enabled ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
        </div>
      `;

    case 6: // Review Sheet
      return `
        <h2 style="font-size:20px; font-weight:700; margin-bottom:12px;">Submit verification card</h2>
        <p style="color:var(--muted-foreground); font-size:14px; margin-bottom:24px;">Please review your submitted corporate profile info sheet before committing.</p>
        
        <div style="background:var(--muted); border-radius:var(--radius-sm); padding:20px; border:1px solid var(--border); display:flex; flex-direction:column; gap:12px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
            <span style="color:var(--muted-foreground);">Full Name</span>
            <span style="font-weight:600;">${sanitizeHtml(d.name)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
            <span style="color:var(--muted-foreground);">Location</span>
            <span style="font-weight:600;">${sanitizeHtml(d.location)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
            <span style="color:var(--muted-foreground);">Phone Number</span>
            <span style="font-weight:600;">${sanitizeHtml(d.phone)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
            <span style="color:var(--muted-foreground);">Workspace Role</span>
            <span style="font-weight:700; text-transform:capitalize;">${sanitizeHtml(d.role)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
            <span style="color:var(--muted-foreground);">Business Name</span>
            <span style="font-weight:600;">${sanitizeHtml(d.business_name || 'N/A')}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--muted-foreground);">Security Switchlock</span>
            <span class="status-badge ${d.biometrics_enabled ? 'active' : 'inactive'}">${d.biometrics_enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      `;
    default:
      return '';
  }
}

function bindCompleteProfileEvents() {
  if (!state.completeProfileData) {
    state.completeProfileData = {
      heard_from: '',
      role: '',
      name: '',
      location: '',
      phone: '',
      bio: '',
      business_name: '',
      org_location: '',
      org_email: '',
      total_workers: '',
      average_revenue: '',
      biometrics_enabled: false,
      notifications_enabled: false
    };
  }

  const d = state.completeProfileData;
  const nextBtn = document.getElementById('wiz-next-btn');
  const backBtn = document.getElementById('wiz-back-btn');

  // Option select list handlers
  document.querySelectorAll('.option-select-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).dataset.value || '';
      if (state.completeProfileSlide === 0) {
        d.heard_from = val;
      } else if (state.completeProfileSlide === 1) {
        d.role = val;
      }
      renderApp();
    });
  });

  // Track inputs on step 2
  const nameIn = document.getElementById('cp-name') as HTMLInputElement;
  const locIn = document.getElementById('cp-location') as HTMLInputElement;
  const bioIn = document.getElementById('cp-bio') as HTMLTextAreaElement;

  if (nameIn) nameIn.addEventListener('input', () => d.name = nameIn.value);
  if (locIn) locIn.addEventListener('input', () => d.location = locIn.value);
  if (bioIn) bioIn.addEventListener('input', () => d.bio = bioIn.value);

  if (state.completeProfileSlide === 2) {
    bindPhoneInputEvents('cp-phone', (val) => {
      d.phone = val;
    });
  }

  // Track inputs on step 3
  const bizIn = document.getElementById('cp-biz-name') as HTMLInputElement;
  const orgLoc = document.getElementById('cp-org-location') as HTMLInputElement;
  const orgEmail = document.getElementById('cp-org-email') as HTMLInputElement;
  const workers = document.getElementById('cp-workers') as HTMLInputElement;
  const rev = document.getElementById('cp-revenue') as HTMLInputElement;

  if (bizIn) bizIn.addEventListener('input', () => d.business_name = bizIn.value);
  if (orgLoc) orgLoc.addEventListener('input', () => d.org_location = orgLoc.value);
  if (orgEmail) orgEmail.addEventListener('input', () => d.org_email = orgEmail.value);
  if (workers) workers.addEventListener('input', () => d.total_workers = workers.value);
  if (rev) rev.addEventListener('input', () => d.average_revenue = rev.value);

  // Switches
  const bioSwitch = document.getElementById('cp-biometrics') as HTMLInputElement;
  const notifSwitch = document.getElementById('cp-notifications') as HTMLInputElement;

  if (bioSwitch) bioSwitch.addEventListener('change', () => d.biometrics_enabled = bioSwitch.checked);
  if (notifSwitch) notifSwitch.addEventListener('change', () => d.notifications_enabled = notifSwitch.checked);

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (state.completeProfileSlide > 0) {
        state.completeProfileSlide--;
        renderApp();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      // Validations
      if (state.completeProfileSlide === 0 && !d.heard_from) {
        showToast('Please select how you heard about us', 'error');
        return;
      }
      if (state.completeProfileSlide === 1 && !d.role) {
        showToast('Please select your workspace role', 'error');
        return;
      }
      if (state.completeProfileSlide === 2) {
        if (!d.name.trim() || !d.location.trim() || !d.phone.trim()) {
          showToast('Please complete all required personal info fields', 'error');
          return;
        }
        const selectedCountry = _phoneCountryState.get('cp-phone') || 'US';
        const phoneCheck = validateAndFormatPhone(d.phone, selectedCountry);
        if (!phoneCheck.isValid) {
          showToast('Please enter a valid phone number', 'error');
          return;
        }
        d.phone = phoneCheck.formatted;
      }

      if (state.completeProfileSlide < 6) {
        state.completeProfileSlide++;
        renderApp();
      } else {
        // Submit everything to Django
        nextBtn.setAttribute('disabled', 'true');
        nextBtn.innerText = 'Submitting Profile...';

        try {
          const payload = {
            first_name: d.name.split(' ')[0] || d.name,
            location: d.location,
            phone: d.phone,
            heard_from: d.heard_from,
            role: d.role,
            bio: d.bio,
            business_name: d.business_name,
            org_location: d.org_location,
            org_email: d.org_email,
            total_workers: d.total_workers,
            average_revenue: d.average_revenue,
            biometrics_enabled: d.biometrics_enabled,
            notifications_enabled: d.notifications_enabled
          };

          const patchRes = await apiRequest('me/', {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });

          state.user = patchRes;
          showToast('Corporate workspace setup completed successfully!', 'success');
          
          if (state.user?.biometrics_enabled) {
            state.view = 'lock';
          } else {
            state.view = 'app';
          }
          renderApp();
        } catch (err: any) {
          showToast(err.message || 'Failed to update profile', 'error');
          nextBtn.removeAttribute('disabled');
          nextBtn.innerText = 'Complete Setup';
        }
      }
    });
  }
}

// ------------------------------------------------------------
// 6. LOCK SCREEN (SIMULATED BIOMETRIC CHECKS)
// ------------------------------------------------------------

function drawLockScreen(): string {
  return `
    <div class="lock-page">
      <div class="lock-card">
        <div class="login-logo">
          <div class="mark-ring" style="width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 12px; background: var(--foreground); border-color:var(--foreground);">
            ${getLogoMarkSvg(40, 'var(--background)')}
          </div>
          <h1 style="font-size: 22px; font-weight:700;">Workspace Locked</h1>
          <p>Scan your biometrics key or verify credentials to open Admin Suite</p>
        </div>

        <button class="fingerprint-btn ${state.isScanning ? 'scanning' : ''}" id="scan-fingerprint-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2z"></path>
            <path d="M12 6a6 6 0 0 0-6 6c0 1.657.672 3.157 1.757 4.243"></path>
            <path d="M8.243 17.757a8 8 0 0 0 7.514 0"></path>
            <path d="M16.243 13.757A6 6 0 0 0 18 12c0-3.314-2.686-6-6-6"></path>
            <circle cx="12" cy="12" r="1.5"></circle>
          </svg>
        </button>

        <div style="font-size: 13px; font-weight: 500; height: 20px; margin-bottom: 24px;">
          ${state.isScanning ? '<span style="color:var(--accent);">Scanning fingerprint key...</span>' : ''}
          ${state.lockError ? `<span class="lock-error">${sanitizeHtml(state.lockError)}</span>` : ''}
        </div>

        <button class="btn btn-outline" id="lock-logout-btn" style="width:100%;">Sign out and use password</button>
      </div>
    </div>
  `;
}

function bindLockEvents() {
  const scanBtn = document.getElementById('scan-fingerprint-btn');
  const logoutBtn = document.getElementById('lock-logout-btn');

  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      if (state.isScanning) return;
      state.isScanning = true;
      state.lockError = '';
      renderApp();

      setTimeout(() => {
        state.isScanning = false;
        state.view = 'app';
        renderApp();
        showToast('App unlocked via biometrics!', 'success');
      }, 1400);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('admin-suite.token');
      state.authToken = null;
      state.isAuthenticated = false;
      state.user = null;
      state.view = 'login';
      renderApp();
      showToast('Logged out successfully', 'info');
    });
  }
}

// ------------------------------------------------------------
// 7. OFFLINE WARNING BOUNDARY
// ------------------------------------------------------------

function drawOfflineScreen(): string {
  return `
    <div class="offline-gate">
      <div class="offline-card">
        <div class="offline-icon">
          ${getIconSvg('wifi-off')}
        </div>
        <h2>Ecosystem Connection Failed</h2>
        <p>
          Unable to establish contact with the Django REST Backend server on <strong>http://localhost:8000/</strong>.<br/>
          Make sure server execution command (<code>python manage.py runserver</code>) is running.
        </p>
        <button class="btn btn-primary" id="retry-sync-btn" style="width:100%;">Retry Connection</button>
      </div>
    </div>
  `;
}

function bindOfflineEvents() {
  const retryBtn = document.getElementById('retry-sync-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.setAttribute('disabled', 'true');
      retryBtn.innerText = 'Connecting...';
      
      const ok = await syncAppData();
      if (ok) {
        if (state.user && !state.user.profile_complete) {
          state.view = 'complete-profile';
        } else if (state.user?.biometrics_enabled) {
          state.view = 'lock';
        } else {
          state.view = 'app';
        }
        renderApp();
      } else {
        showToast('Backend still unreachable.', 'error');
        retryBtn.removeAttribute('disabled');
        retryBtn.innerText = 'Retry Connection';
      }
    });
  }
}

// ------------------------------------------------------------
// 8. TABS VIEW: SIDEBAR, TOPBAR & BASE NAVIGATION
// ------------------------------------------------------------

function drawSidebar(): string {
  const role = (state.user?.role || '').toLowerCase();
  const isEmployee = role === 'employee';
  const isManager = ['hr', 'finance', 'operations', 'secretary', 'dept_manager'].includes(role);

  // Unread chat count badge
  const chatUnread = state.chatContacts.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);

  // CEO and branch admins see full management menu; employees see a limited set
  const navItems: Array<{id: string; label: string; icon: string; badge?: string}> = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    ...(isEmployee ? [] : [
      { id: 'employees', label: 'Employees', icon: 'users', badge: state.employees.length ? state.employees.length.toString() : '' },
      { id: 'clients', label: 'Clients', icon: 'briefcase', badge: state.clients.length ? state.clients.length.toString() : '' },
    ]),
    ...(isEmployee || isManager ? [] : [
      { id: 'finance', label: 'Finance', icon: 'trending-up' },
    ]),
    ...(isManager ? [
      { id: 'finance', label: 'Finance', icon: 'trending-up' },
    ] : []),
    { id: 'chat', label: 'Team Chat', icon: 'message-circle', badge: chatUnread > 0 ? chatUnread.toString() : '' },
    { id: 'settings', label: 'Profile Settings', icon: 'settings' },
    ...(!isEmployee ? [{ id: 'pricing', label: 'Subscription', icon: 'star' }] : []),
  ];

  const itemsHtml = navItems.map(item => `
    <button class="nav-item ${state.activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">
      ${getIconSvg(item.icon)}
      <span>${item.label}</span>
      ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
    </button>
  `).join('');

  return `
    <aside class="sidebar ${state.isMobileSidebarOpen ? 'open' : ''}">
      <div class="sidebar-header">
        <div class="sidebar-logo" style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none;">
          ${getLogoMarkSvg(36, 'var(--accent)')}
        </div>
        <div class="sidebar-brand">
          Admin Suite
          <span>ORGANIZATION VIEW</span>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Management Portal</div>
        ${itemsHtml}
      </nav>
      
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar" style="font-weight:700;">
            ${sanitizeHtml((state.user?.name || state.user?.username || 'A').slice(0, 2).toUpperCase())}
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${sanitizeHtml(state.user?.name || state.user?.username || 'User')}</div>
            <div class="sidebar-user-role" style="color:var(--accent); text-transform:uppercase; font-size:9px; font-weight:700; letter-spacing:0.5px;">${sanitizeHtml((state.user?.role || 'ADMIN').toUpperCase())}</div>
          </div>
          <button class="btn-ghost" id="logout-sidebar-btn" style="padding: 4px; border-radius: var(--radius-sm);" title="Logout">
            ${getIconSvg('log-out')}
          </button>
        </div>
      </div>
    </aside>
  `;
}

function drawTopbar(): string {
  const unreadNotifCount = state.notifications.length;
  
  return `
    <header class="topbar">
      <div class="topbar-left">
        <button class="hamburger" id="hamburger-menu-btn">
          ${getIconSvg('menu')}
        </button>
        <h1 class="topbar-title">
          ${state.activeTab.charAt(0).toUpperCase() + state.activeTab.slice(1)} View
        </h1>
      </div>
      
      <div class="topbar-right" style="position: relative;">
        <button class="topbar-btn" id="theme-toggle-btn" title="Toggle theme">
          ${state.theme === 'dark' ? getIconSvg('sun') : getIconSvg('moon')}
        </button>
        
        <button class="topbar-btn" id="notification-dropdown-btn" title="View announcements" style="position: relative;">
          ${getIconSvg('bell')}
          ${unreadNotifCount > 0 ? '<span class="badge-dot" style="position: absolute; top:8px; right:8px; width:8px; height:8px; background:var(--danger); border-radius:50%;"></span>' : ''}
        </button>
        
        ${drawNotificationDropdown()}
      </div>
    </header>
  `;
}

function drawNotificationDropdown(): string {
  if (!state.isNotificationsOpen) return '';
  
  const notificationsHtml = state.notifications.map(n => `
    <div class="notif-row" style="padding: 12px; border-bottom: 1px solid var(--border);">
      <div style="font-size: 13px; color: var(--foreground); font-weight:600; margin-bottom: 2px;">${sanitizeHtml(n.title)}</div>
      <div style="font-size: 11px; color: var(--muted-foreground); margin-bottom: 4px;">${sanitizeHtml(n.body)}</div>
      <div style="font-size: 10px; color: var(--accent);">${sanitizeHtml(n.time)}</div>
    </div>
  `).join('');
  
  return `
    <div class="card" style="position: absolute; top: 50px; right: 0; width: 320px; z-index: 1000; box-shadow: var(--shadow-lg); border-color: var(--border); background:var(--card);">
      <div class="card-header" style="padding: 12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border);">
        <span style="font-size: 13px; font-weight: 700;">Announcements & Alerts</span>
        <span style="font-size: 10px; padding: 2px 6px; background:var(--muted); border-radius:4px;">${state.notifications.length} Total</span>
      </div>
      <div class="card-body" style="padding: 0; max-height: 240px; overflow-y: auto;">
        ${notificationsHtml || '<div style="padding: 24px; text-align: center; color: var(--muted-foreground); font-size:12px;">No new alerts.</div>'}
      </div>
    </div>
  `;
}

function bindNavigationEvents() {
  // Tab selectors
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', (e) => {
      const tabId = (e.currentTarget as HTMLButtonElement).dataset.tab;
      if (tabId) navigateToTab(tabId as any);
    });
  });

  // Hamburger menu toggle
  const ham = document.getElementById('hamburger-menu-btn');
  const overlay = document.getElementById('sidebar-overlay');
  if (ham) {
    ham.addEventListener('click', () => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
      renderApp();
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      state.isMobileSidebarOpen = false;
      renderApp();
    });
  }

  // Theme switch
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', state.theme);
      document.documentElement.setAttribute('data-theme', state.theme);
      renderApp();
    });
  }

  // Notification toggle
  const notifBtn = document.getElementById('notification-dropdown-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.isNotificationsOpen = !state.isNotificationsOpen;
      renderApp();
    });
  }

  // Dismiss notification popup on body clicks
  document.body.onclick = (e) => {
    if (state.isNotificationsOpen) {
      const btn = document.getElementById('notification-dropdown-btn');
      if (btn && !btn.contains(e.target as Node)) {
        state.isNotificationsOpen = false;
        renderApp();
      }
    }
  };

  // Logout button
  const logout = document.getElementById('logout-sidebar-btn');
  if (logout) {
    logout.addEventListener('click', () => {
      localStorage.removeItem('admin-suite.token');
      state.authToken = null;
      state.isAuthenticated = false;
      state.user = null;
      state.view = 'login';
      renderApp();
      showToast('Logged out successfully', 'info');
    });
  }
}

function drawTabContent(): string {
  switch (state.activeTab) {
    case 'dashboard':
      return drawDashboardTab();
    case 'employees':
      return drawEmployeesTab();
    case 'clients':
      return drawClientsTab();
    case 'finance':
      return drawFinanceTab();
    case 'chat':
      return drawChatTab();
    case 'settings':
      return drawSettingsTab();
    case 'pricing':
      return drawPricingTab();
    default:
      return drawDashboardTab();
  }
}

function bindTabSpecificEvents() {
  switch (state.activeTab) {
    case 'dashboard':
      bindDashboardEvents();
      break;
    case 'employees':
      bindEmployeesEvents();
      break;
    case 'clients':
      bindClientsEvents();
      break;
    case 'finance':
      bindFinanceEvents();
      break;
    case 'chat':
      bindChatEvents();
      break;
    case 'settings':
      bindSettingsEvents();
      break;
    case 'pricing':
      bindPricingEvents();
      break;
  }
}

// ------------------------------------------------------------
// 8A. DASHBOARD TAB VIEW
// ------------------------------------------------------------

function drawDashboardTab(): string {
  const role = (state.user?.role || '').toLowerCase();
  const isEmployee = role === 'employee';
  const isFinance = role === 'finance';
  const isHR = role === 'hr';
  const isOps = role === 'operations';
  const isSecretary = role === 'secretary';
  const isDeptManager = role === 'dept_manager';

  if (isEmployee) return drawEmployeePersonalDashboard();
  if (isHR) return drawHRDashboard();
  if (isFinance) return drawFinanceDashboard();
  if (isOps) return drawOpsDashboard();
  if (isSecretary) return drawSecretaryDashboard();
  if (isDeptManager) return drawDeptManagerDashboard();
  // CEO and Branch Admin get the full dashboard
  return drawAdminDashboard();
}

// ---- Employee Personal Dashboard ----
function drawEmployeePersonalDashboard(): string {
  const emp = state.employees.find((e: any) => e.linked_user === state.user?.id) || state.employees[0];
  const tasks = emp?.tasks || [];
  const leaves = emp?.leaves || [];
  const queries = emp?.queries || [];

  const pendingTasks = tasks.filter((t: any) => t.status !== 'completed');
  const activeLeave = leaves.find((l: any) => l.status === 'active');
  const openQueries = queries.filter((q: any) => q.status === 'open');

  const taskRows = pendingTasks.slice(0, 4).map((t: any) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px; font-weight:600;">${sanitizeHtml(t.title)}</div>
        <div style="font-size:11px; color:var(--muted-foreground);">Due: ${sanitizeHtml(t.due_date || 'N/A')}</div>
      </div>
      <span class="status-badge ${t.priority === 'high' ? 'inactive' : t.priority === 'medium' ? '' : 'active'}" style="font-size:10px;">${sanitizeHtml(t.priority)}</span>
    </div>
  `).join('');

  return `
    <div class="gradient-header" style="background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%);">
      <h2>My Workspace</h2>
      <h1>${sanitizeHtml(state.user?.name || 'Employee')}</h1>
      <div class="role-chip">${getIconSvg('user')}<span>EMPLOYEE PORTAL</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-card-header"><div class="stat-card-icon blue">${getIconSvg('clipboard')}</div></div>
        <div class="stat-card-label">Pending Tasks</div>
        <div class="stat-card-value">${pendingTasks.length}</div>
      </div>
      <div class="stat-card ${activeLeave ? 'orange' : 'green'}">
        <div class="stat-card-header"><div class="stat-card-icon ${activeLeave ? 'orange' : 'green'}">${getIconSvg('calendar')}</div></div>
        <div class="stat-card-label">Leave Status</div>
        <div class="stat-card-value" style="font-size:14px;">${activeLeave ? sanitizeHtml(activeLeave.leave_type) : 'On Duty'}</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-card-header"><div class="stat-card-icon purple">${getIconSvg('dollar-sign')}</div></div>
        <div class="stat-card-label">Monthly Salary</div>
        <div class="stat-card-value" style="font-size:18px;">${emp ? formatCurrency(emp.salary) : '—'}</div>
      </div>
      <div class="stat-card ${openQueries.length > 0 ? 'orange' : 'blue'}">
        <div class="stat-card-header"><div class="stat-card-icon ${openQueries.length > 0 ? 'orange' : 'blue'}">${getIconSvg('alert')}</div></div>
        <div class="stat-card-label">Open Queries</div>
        <div class="stat-card-value">${openQueries.length}</div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">My Tasks</div>
          <button class="card-action" id="emp-dash-chat-btn">Message Team</button>
        </div>
        <div class="card-body">
          ${taskRows || '<div style="padding:20px; text-align:center; color:var(--muted-foreground);">No pending tasks — you\'re all caught up!</div>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">My Profile</div></div>
        <div class="card-body">
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
            <div class="avatar blue" style="width:56px; height:56px; font-size:20px; font-weight:700;">
              ${sanitizeHtml((state.user?.name || 'E').slice(0,2).toUpperCase())}
            </div>
            <div>
              <div style="font-weight:700; font-size:16px;">${sanitizeHtml(state.user?.name || '')}</div>
              <div style="color:var(--muted-foreground); font-size:12px;">${sanitizeHtml(state.user?.email || '')}</div>
              <div style="color:var(--accent); font-size:11px; font-weight:600; margin-top:2px;">${sanitizeHtml(emp?.department || '')} · ${sanitizeHtml(emp?.role || 'Employee')}</div>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Office</span>
              <span style="font-weight:600;">${sanitizeHtml(emp?.office || 'Main Office')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Performance</span>
              <span style="font-weight:600;">${emp?.performance || 0}%</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--muted-foreground);">Status</span>
              <span class="status-badge active">${sanitizeHtml(emp?.status || 'active')}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div class="card-title">My Financials</div>
          ${emp?.finance?.last_finance_update ? `<span style="font-size:11px; color:var(--muted-foreground);">Updated: ${new Date(emp.finance.last_finance_update).toLocaleTimeString()}</span>` : ''}
        </div>
        <div class="card-body">
          <div style="display:flex; flex-direction:column; gap:10px; font-size:13px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Base Salary</span>
              <span style="font-weight:600; font-variant-numeric: tabular-nums;">${formatCurrency(emp.salary)}/mo</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Accumulated Bonuses</span>
              <span style="font-weight:600; color:var(--success); font-variant-numeric: tabular-nums;">+${formatCurrency(emp?.finance?.bonuses || 0)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Deductions</span>
              <span style="font-weight:600; color:var(--destructive); font-variant-numeric: tabular-nums;">-${formatCurrency(emp?.finance?.deductions || 0)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Equity Shares</span>
              <span style="font-weight:600; font-variant-numeric: tabular-nums;">${emp?.finance?.shares || 0}%</span>
            </div>
            ${parseFloat(emp?.finance?.employee_owes_company || 0) > 0 ? `
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Owed to Company</span>
              <span style="font-weight:600; color:var(--destructive); font-variant-numeric: tabular-nums;">${formatCurrency(emp.finance.employee_owes_company)}</span>
            </div>
            ` : ''}
            ${parseFloat(emp?.finance?.company_owes_employee || 0) > 0 ? `
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:6px;">
              <span style="color:var(--muted-foreground);">Reimbursements Pending</span>
              <span style="font-weight:600; color:var(--success); font-variant-numeric: tabular-nums;">${formatCurrency(emp.finance.company_owes_employee)}</span>
            </div>
            ` : ''}
            <div style="display:flex; justify-content:space-between; font-weight:700; font-size:14px; margin-top:4px; border-top:1px dashed var(--border); padding-top:8px;">
              <span>Net Pay Estimate</span>
              <span style="font-variant-numeric: tabular-nums;">${formatCurrency(Math.max(0, Number(emp.salary || 0) + Number(emp?.finance?.bonuses || 0) - Number(emp?.finance?.deductions || 0) - Number(emp?.finance?.employee_owes_company || 0) + Number(emp?.finance?.company_owes_employee || 0)))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- HR Dashboard ----
function drawHRDashboard(): string {
  const m = state.metrics || { employees: 0, activeProjects: 0, clients: 0, netProfit: 0, totalIncome: 0, totalExpense: 0 };
  const onLeave = state.employees.filter((e: any) => e.status === 'on_leave').length;
  const activeCount = state.employees.filter((e: any) => e.status === 'active').length;
  const flagged = state.employees.filter((e: any) => e.is_flagged).length;

  const recentEmpRows = state.employees.slice(0, 5).map((e: any) => `
    <tr>
      <td><div class="user-row"><div class="avatar blue">${sanitizeHtml(e.initials || e.name[0])}</div><div><div class="cell-primary">${sanitizeHtml(e.name)}</div><div class="cell-muted">${sanitizeHtml(e.department)}</div></div></div></td>
      <td>${sanitizeHtml(e.role)}</td>
      <td><span class="status-badge ${e.status === 'active' ? 'active' : 'inactive'}">${sanitizeHtml(e.status)}</span></td>
    </tr>
  `).join('');

  return `
    <div class="gradient-header" style="background: linear-gradient(135deg, #065f46 0%, #064e3b 100%);">
      <h2>HR Management Console</h2>
      <h1>${sanitizeHtml(state.user?.name || 'HR Manager')}</h1>
      <div class="role-chip">${getIconSvg('users')}<span>HR MANAGER WORKSPACE</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon blue">${getIconSvg('users')}</div></div><div class="stat-card-label">Total Headcount</div><div class="stat-card-value">${m.employees}</div></div>
      <div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon green">${getIconSvg('activity')}</div></div><div class="stat-card-label">Active Staff</div><div class="stat-card-value">${activeCount}</div></div>
      <div class="stat-card orange"><div class="stat-card-header"><div class="stat-card-icon orange">${getIconSvg('calendar')}</div></div><div class="stat-card-label">On Leave</div><div class="stat-card-value">${onLeave}</div></div>
      <div class="stat-card purple"><div class="stat-card-header"><div class="stat-card-icon purple">${getIconSvg('alert')}</div></div><div class="stat-card-label">Flagged Staff</div><div class="stat-card-value">${flagged}</div></div>
    </div>

    <div class="card" style="overflow-x:auto;">
      <div class="card-header">
        <div class="card-title">Staff Roster</div>
        <button class="card-action" id="hr-go-employees-btn">Manage Employees</button>
      </div>
      <div class="card-body" style="padding:0;">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>${recentEmpRows || '<tr><td colspan="3" style="text-align:center; padding:24px; color:var(--muted-foreground);">No staff records yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="card-header"><div class="card-title">Quick HR Actions</div></div>
      <div class="card-body">
        <div class="quick-actions">
          <button class="quick-action-btn" id="hr-qa-add-staff"><div class="quick-action-icon blue">+</div><span>Onboard Staff</span></button>
          <button class="quick-action-btn" id="hr-qa-chat"><div class="quick-action-icon green">${getIconSvg('message-circle')}</div><span>Team Chat</span></button>
          <button class="quick-action-btn" id="hr-qa-settings"><div class="quick-action-icon purple">⚙</div><span>My Settings</span></button>
        </div>
      </div>
    </div>
  `;
}

// ---- Finance Dashboard ----
function drawFinanceDashboard(): string {
  const m = state.metrics || { employees: 0, activeProjects: 0, clients: 0, netProfit: 0, totalIncome: 0, totalExpense: 0 };
  const recentTx = state.transactions.slice(0, 6);
  const txRows = recentTx.map((t: any) => {
    const isIncome = t.type === 'income';
    return `
      <div class="transaction-item" style="padding:10px 0;">
        <div class="transaction-info">
          <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">${isIncome ? '↓' : '↑'}</div>
          <div><div class="transaction-name">${sanitizeHtml(t.description)}</div><div class="transaction-date">${sanitizeHtml(t.category)} · ${sanitizeHtml(t.date)}</div></div>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">${isIncome ? '+' : '-'}${formatCurrency(t.amount)}</div>
      </div>`;
  }).join('');

  return `
    <div class="gradient-header" style="background: linear-gradient(135deg, #78350f 0%, #92400e 100%);">
      <h2>Finance Control Centre</h2>
      <h1>${sanitizeHtml(state.user?.name || 'Finance Officer')}</h1>
      <div class="role-chip">${getIconSvg('trending-up')}<span>FINANCE OFFICER WORKSPACE</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon green">${getIconSvg('trending-up')}</div><span class="stat-card-change up">In</span></div><div class="stat-card-label">Total Income</div><div class="stat-card-value">${formatCurrency(m.totalIncome)}</div></div>
      <div class="stat-card orange"><div class="stat-card-header"><div class="stat-card-icon orange">${getIconSvg('activity')}</div><span class="stat-card-change down">Out</span></div><div class="stat-card-label">Total Expenses</div><div class="stat-card-value">${formatCurrency(m.totalExpense)}</div></div>
      <div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon blue">${getIconSvg('dollar-sign')}</div></div><div class="stat-card-label">Net Profit</div><div class="stat-card-value">${formatCurrency(m.netProfit)}</div></div>
      <div class="stat-card purple"><div class="stat-card-header"><div class="stat-card-icon purple">${getIconSvg('briefcase')}</div></div><div class="stat-card-label">Active Clients</div><div class="stat-card-value">${m.clients}</div></div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Transactions</div><button class="card-action" id="fin-go-finance-btn">Full Ledger</button></div>
        <div class="card-body"><div style="display:flex; flex-direction:column; gap:4px;">${txRows || '<div style="padding:20px; text-align:center; color:var(--muted-foreground);">No transactions yet.</div>'}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Finance Quick Actions</div></div>
        <div class="card-body">
          <div class="quick-actions">
            <button class="quick-action-btn" id="fin-qa-log-income"><div class="quick-action-icon green">+</div><span>Log Income</span></button>
            <button class="quick-action-btn" id="fin-qa-log-cost"><div class="quick-action-icon orange">+</div><span>Log Cost</span></button>
            <button class="quick-action-btn" id="fin-qa-chat"><div class="quick-action-icon blue">${getIconSvg('message-circle')}</div><span>Team Chat</span></button>
            <button class="quick-action-btn" id="fin-qa-settings"><div class="quick-action-icon purple">⚙</div><span>Settings</span></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Operations Dashboard ----
function drawOpsDashboard(): string {
  const m = state.metrics || { employees: 0, activeProjects: 0, clients: 0, netProfit: 0, totalIncome: 0, totalExpense: 0 };
  const activeProj = state.projects.filter((p: any) => p.status === 'active').slice(0, 4);
  const projRows = activeProj.map((p: any) => `
    <div style="margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:4px;">
        <span>${sanitizeHtml(p.name)}</span><span>${p.progress}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill blue" style="width:${p.progress}%;"></div></div>
      <div style="font-size:11px; color:var(--muted-foreground); margin-top:3px;">${sanitizeHtml(p.client_name || 'Client')}</div>
    </div>
  `).join('');

  return `
    <div class="gradient-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #1a2e4a 100%);">
      <h2>Operations Control</h2>
      <h1>${sanitizeHtml(state.user?.name || 'Operational Officer')}</h1>
      <div class="role-chip">${getIconSvg('grid')}<span>OPERATIONS WORKSPACE</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon blue">${getIconSvg('grid')}</div></div><div class="stat-card-label">Active Projects</div><div class="stat-card-value">${m.activeProjects}</div></div>
      <div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon green">${getIconSvg('briefcase')}</div></div><div class="stat-card-label">Clients</div><div class="stat-card-value">${m.clients}</div></div>
      <div class="stat-card orange"><div class="stat-card-header"><div class="stat-card-icon orange">${getIconSvg('users')}</div></div><div class="stat-card-label">Team Size</div><div class="stat-card-value">${m.employees}</div></div>
      <div class="stat-card purple"><div class="stat-card-header"><div class="stat-card-icon purple">${getIconSvg('activity')}</div></div><div class="stat-card-label">Net Profit</div><div class="stat-card-value" style="font-size:16px;">${formatCurrency(m.netProfit)}</div></div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Active Project Tracking</div><button class="card-action" id="ops-go-clients-btn">View Clients</button></div>
        <div class="card-body">${projRows || '<div style="padding:20px; text-align:center; color:var(--muted-foreground);">No active projects.</div>'}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Quick Actions</div></div>
        <div class="card-body">
          <div class="quick-actions">
            <button class="quick-action-btn" id="ops-qa-clients"><div class="quick-action-icon green">👥</div><span>Clients</span></button>
            <button class="quick-action-btn" id="ops-qa-employees"><div class="quick-action-icon blue">🏢</div><span>Team</span></button>
            <button class="quick-action-btn" id="ops-qa-chat"><div class="quick-action-icon orange">${getIconSvg('message-circle')}</div><span>Team Chat</span></button>
            <button class="quick-action-btn" id="ops-qa-settings"><div class="quick-action-icon purple">⚙</div><span>Settings</span></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Secretary Dashboard ----
function drawSecretaryDashboard(): string {
  const m = state.metrics || { employees: 0, activeProjects: 0, clients: 0, netProfit: 0, totalIncome: 0, totalExpense: 0 };
  const recentNotifs = state.notifications.slice(0, 5);
  const notifRows = recentNotifs.map((n: any) => `
    <div style="padding:10px 0; border-bottom:1px solid var(--border);">
      <div style="font-size:13px; font-weight:600;">${sanitizeHtml(n.title)}</div>
      <div style="font-size:11px; color:var(--muted-foreground);">${sanitizeHtml(n.body)}</div>
      <div style="font-size:10px; color:var(--accent); margin-top:3px;">${sanitizeHtml(n.time)}</div>
    </div>
  `).join('');

  return `
    <div class="gradient-header" style="background: linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%);">
      <h2>Secretary's Desk</h2>
      <h1>${sanitizeHtml(state.user?.name || 'Secretary')}</h1>
      <div class="role-chip">${getIconSvg('clipboard')}<span>SECRETARY WORKSPACE</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon blue">${getIconSvg('users')}</div></div><div class="stat-card-label">Total Staff</div><div class="stat-card-value">${m.employees}</div></div>
      <div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon green">${getIconSvg('briefcase')}</div></div><div class="stat-card-label">Clients</div><div class="stat-card-value">${m.clients}</div></div>
      <div class="stat-card orange"><div class="stat-card-header"><div class="stat-card-icon orange">${getIconSvg('bell')}</div></div><div class="stat-card-label">Notifications</div><div class="stat-card-value">${state.notifications.length}</div></div>
      <div class="stat-card purple"><div class="stat-card-header"><div class="stat-card-icon purple">${getIconSvg('activity')}</div></div><div class="stat-card-label">Active Projects</div><div class="stat-card-value">${m.activeProjects}</div></div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Recent Announcements</div></div>
        <div class="card-body">${notifRows || '<div style="padding:20px; text-align:center; color:var(--muted-foreground);">No announcements.</div>'}</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Quick Access</div></div>
        <div class="card-body">
          <div class="quick-actions">
            <button class="quick-action-btn" id="sec-qa-employees"><div class="quick-action-icon blue">👤</div><span>Staff</span></button>
            <button class="quick-action-btn" id="sec-qa-clients"><div class="quick-action-icon green">💼</div><span>Clients</span></button>
            <button class="quick-action-btn" id="sec-qa-chat"><div class="quick-action-icon orange">${getIconSvg('message-circle')}</div><span>Team Chat</span></button>
            <button class="quick-action-btn" id="sec-qa-settings"><div class="quick-action-icon purple">⚙</div><span>Settings</span></button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function drawDeptManagerDashboard(): string {
  const m = state.metrics || { employees: 0, activeProjects: 0, clients: 0, netProfit: 0, totalIncome: 0, totalExpense: 0 };
  const deptEmployees = state.employees.slice(0, 5);
  const empRows = deptEmployees.map((e: any) => `
    <tr>
      <td><div class="user-row"><div class="avatar blue">${sanitizeHtml(e.initials || e.name[0])}</div><div><div class="cell-primary">${sanitizeHtml(e.name)}</div></div></div></td>
      <td>${sanitizeHtml(e.role)}</td>
      <td><div class="progress-bar" style="width:80px;"><div class="progress-fill blue" style="width:${e.performance || 0}%;"></div></div></td>
    </tr>
  `).join('');

  return `
    <div class="gradient-header" style="background: linear-gradient(135deg, #831843 0%, #9d174d 100%);">
      <h2>Department Overview</h2>
      <h1>${sanitizeHtml(state.user?.name || 'Department Manager')}</h1>
      <div class="role-chip">${getIconSvg('briefcase')}<span>DEPT MANAGER WORKSPACE</span></div>
    </div>

    <div class="stats-grid">
      <div class="stat-card blue"><div class="stat-card-header"><div class="stat-card-icon blue">${getIconSvg('users')}</div></div><div class="stat-card-label">Team Members</div><div class="stat-card-value">${m.employees}</div></div>
      <div class="stat-card green"><div class="stat-card-header"><div class="stat-card-icon green">${getIconSvg('grid')}</div></div><div class="stat-card-label">Active Projects</div><div class="stat-card-value">${m.activeProjects}</div></div>
      <div class="stat-card orange"><div class="stat-card-header"><div class="stat-card-icon orange">${getIconSvg('activity')}</div></div><div class="stat-card-label">Clients</div><div class="stat-card-value">${m.clients}</div></div>
      <div class="stat-card purple"><div class="stat-card-header"><div class="stat-card-icon purple">${getIconSvg('dollar-sign')}</div></div><div class="stat-card-label">Net Profit</div><div class="stat-card-value" style="font-size:16px;">${formatCurrency(m.netProfit)}</div></div>
    </div>

    <div class="card" style="overflow-x:auto;">
      <div class="card-header">
        <div class="card-title">Team Performance</div>
        <button class="card-action" id="dm-go-employees-btn">View All Staff</button>
      </div>
      <div class="card-body" style="padding:0;">
        <table class="data-table">
          <thead><tr><th>Member</th><th>Role</th><th>Performance</th></tr></thead>
          <tbody>${empRows || '<tr><td colspan="3" style="text-align:center; padding:24px; color:var(--muted-foreground);">No team members yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:20px;">
      <div class="card-header"><div class="card-title">Quick Actions</div></div>
      <div class="card-body">
        <div class="quick-actions">
          <button class="quick-action-btn" id="dm-qa-employees"><div class="quick-action-icon blue">+</div><span>Add Member</span></button>
          <button class="quick-action-btn" id="dm-qa-clients"><div class="quick-action-icon green">💼</div><span>Clients</span></button>
          <button class="quick-action-btn" id="dm-qa-chat"><div class="quick-action-icon orange">${getIconSvg('message-circle')}</div><span>Team Chat</span></button>
          <button class="quick-action-btn" id="dm-qa-settings"><div class="quick-action-icon purple">⚙</div><span>Settings</span></button>
        </div>
      </div>
    </div>
  `;
}

// ---- Full Admin/CEO/Branch Admin Dashboard ----
function drawAdminDashboard(): string {
  const m = state.metrics || { employees: 0, activeProjects: 0, clients: 0, netProfit: 0, totalIncome: 0, totalExpense: 0 };
  
  // Recent transactions list
  const recentTx = state.transactions.slice(0, 4);
  const txHtml = recentTx.map((t: any) => {
    const isIncome = t.type === 'income';
    return `
      <div class="transaction-item" style="padding: 10px 0;">
        <div class="transaction-info">
          <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">${isIncome ? '↓' : '↑'}</div>
          <div>
            <div class="transaction-name">${sanitizeHtml(t.description)}</div>
            <div class="transaction-date">${sanitizeHtml(t.category)}</div>
          </div>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
      </div>
    `;
  }).join('');

  // Active projects bars
  const activeProj = state.projects.filter((p: any) => p.status === 'active').slice(0, 3);
  const projHtml = activeProj.map((p: any) => `
    <div style="margin-bottom: 16px;">
      <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:6px;">
        <span>${sanitizeHtml(p.name)} <span style="font-weight:400; color:var(--muted-foreground)">(${sanitizeHtml(p.client_name || 'Project Client')})</span></span>
        <span>${p.progress}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill blue" style="width: ${p.progress}%;"></div>
      </div>
    </div>
  `).join('');

  return `
    <div class="gradient-header">
      <h2>Welcome Back,</h2>
      <h1>${sanitizeHtml(state.user?.name || state.user?.username || 'Administrator')}</h1>
      <div class="role-chip">
        ${getIconSvg('shield')}
        <span>${sanitizeHtml((state.user?.role || 'admin').toUpperCase())} ACCOUNT</span>
      </div>
    </div>

    <!-- Live Net profit banner -->
    <div id="tour-net-profit" class="card" style="margin-bottom: 24px; padding: 24px; background:linear-gradient(135deg, #09090b 0%, #1e3a8a 100%); color:#fff; border:none;">
      <div style="font-size:14px; font-weight:500; opacity:0.8; margin-bottom:4px;">Net Profit · This Month</div>
      <div style="font-size:36px; font-weight:800; font-variant-numeric:tabular-nums; margin-bottom:12px;">${formatCurrency(m.netProfit)}</div>
      <div style="display:flex; gap:16px; font-size:12px; font-weight:600;">
        <span style="color:#86efac; display:inline-flex; align-items:center; gap:4px;">↓ Income: ${formatCurrency(m.totalIncome)}</span>
        <span style="color:#fca5a5; display:inline-flex; align-items:center; gap:4px;">↑ Expense: ${formatCurrency(m.totalExpense)}</span>
      </div>
    </div>

    <div class="stats-grid" id="tour-stats-grid">
      <div class="stat-card blue">
        <div class="stat-card-header">
          <div class="stat-card-icon blue">${getIconSvg('users')}</div>
          <span class="stat-card-change up">Stable</span>
        </div>
        <div class="stat-card-label">Active Headcount</div>
        <div class="stat-card-value">${m.employees}</div>
      </div>
      
      <div class="stat-card green">
        <div class="stat-card-header">
          <div class="stat-card-icon green">${getIconSvg('briefcase')}</div>
          <span class="stat-card-change up">+4%</span>
        </div>
        <div class="stat-card-label">Client Portfolio</div>
        <div class="stat-card-value">${m.clients}</div>
      </div>
      
      <div class="stat-card orange">
        <div class="stat-card-header">
          <div class="stat-card-icon orange">${getIconSvg('grid')}</div>
          <span class="stat-card-change up">+12%</span>
        </div>
        <div class="stat-card-label">Active Projects</div>
        <div class="stat-card-value">${m.activeProjects}</div>
      </div>
      
      <div class="stat-card purple">
        <div class="stat-card-header">
          <div class="stat-card-icon purple">${getIconSvg('trending-up')}</div>
          <span class="stat-card-change up">+18%</span>
        </div>
        <div class="stat-card-label">Income flow</div>
        <div class="stat-card-value">${formatCurrency(m.totalIncome)}</div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-body" style="padding: 22px;">
          ${drawDashboardSvgChart()}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Ledgers</div>
          <button class="card-action" id="view-finance-card-btn">View Finance</button>
        </div>
        <div class="card-body">
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${txHtml || '<div style="padding:20px; text-align:center; color:var(--muted-foreground)">No transactions recorded.</div>'}
          </div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Active Projects Tracking</div>
        </div>
        <div class="card-body">
          ${projHtml || '<div style="padding:20px; text-align:center; color:var(--muted-foreground)">No active projects.</div>'}
        </div>
      </div>

      <div class="card" id="tour-quick-actions">
        <div class="card-header">
          <div class="card-title">Quick Operations</div>
        </div>
        <div class="card-body">
          <div class="quick-actions">
            <button class="quick-action-btn" id="qa-add-staff">
              <div class="quick-action-icon blue">+</div>
              <span>Add Staff</span>
            </button>
            <button class="quick-action-btn" id="qa-add-client">
              <div class="quick-action-icon green">+</div>
              <span>Add Client</span>
            </button>
            <button class="quick-action-btn" id="qa-log-cost">
              <div class="quick-action-icon orange">+</div>
              <span>Log Cost</span>
            </button>
            <button class="quick-action-btn" id="qa-settings">
              <div class="quick-action-icon purple">⚙</div>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    ${drawAlertsPanel()}
    ${drawQuotaBars()}
    ${drawBranchLeaderboard()}
    ${drawFinancialCategories()}
  `;
}

// ---- Critical Alerts Panel ----
function drawAlertsPanel(): string {
  const alerts = state.dashboardAlerts;
  if (!alerts || (!alerts.alerts || alerts.alerts.length === 0)) return '';

  const alertTypeIcon: Record<string, string> = { query: '❓', flagged: '🚩', task: '⚡' };
  const alertTypeColor: Record<string, string> = { query: '#f59e0b', flagged: '#ef4444', task: '#8b5cf6' };

  const alertItems = alerts.alerts.map((a: any) => {
    // Use safeProp to prevent prototype pollution from API-sourced a.type
    let aColor = '#6366f1';
    let aIcon = '🔔';
    try {
      const validTypes = ['query', 'flagged', 'task'] as const;
      if (validTypes.includes(a.type)) {
        aColor = safeProp(alertTypeColor, a.type as keyof typeof alertTypeColor) ?? '#6366f1';
        aIcon = safeProp(alertTypeIcon, a.type as keyof typeof alertTypeIcon) ?? '🔔';
      }
    } catch (_) { /* prototype pollution attempt blocked */ }
    return `
    <div style="display:flex; align-items:flex-start; gap:12px; padding:14px 16px; background:var(--card-bg); border-radius:10px; border-left:3px solid ${aColor};">
      <span style="font-size:18px; flex-shrink:0;">${aIcon}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; font-weight:600; color:var(--foreground); margin-bottom:2px;">${sanitizeHtml(a.message)}</div>
        <div style="font-size:11px; color:var(--muted-foreground); text-transform:uppercase; letter-spacing:0.05em;">${sanitizeHtml(a.type)} alert · ${a.count} item${a.count !== 1 ? 's' : ''}</div>
      </div>
      <span style="font-size:20px; font-weight:800; color:${aColor}; flex-shrink:0;">${a.count}</span>
    </div>
  `;
  }).join('');

  return `
    <div class="card" style="margin-bottom:24px; border:1px solid rgba(239,68,68,0.25);">
      <div class="card-header">
        <div class="card-title" style="color:#ef4444; display:flex; align-items:center; gap:8px;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ef4444; animation:pulse 1.5s infinite;"></span>
          Critical Alerts
        </div>
        <span style="font-size:12px; background:rgba(239,68,68,0.12); color:#ef4444; padding:3px 10px; border-radius:20px; font-weight:600;">${alerts.alerts.length} Active</span>
      </div>
      <div class="card-body" style="display:flex; flex-direction:column; gap:10px;">
        ${alertItems}
      </div>
    </div>
  `;
}

// ---- Subscription / Quota Bars ----
function drawQuotaBars(): string {
  const sub = state.subscriptionLimits;
  if (!sub || !sub.usage) return '';

  const plan = sub.plan || 'BASIC';
  const usage = sub.usage as Record<string, { current: number; limit: number }>;
  const planColor: Record<string, string> = { BASIC: '#6366f1', PREMIUM: '#f59e0b', ENTERPRISE: '#10b981' };
  const color = planColor[plan] || '#6366f1';

  const barItems = Object.entries(usage).map(([key, val]: [string, any]) => {
    const pct = val.limit > 0 ? Math.min(100, Math.round((val.current / val.limit) * 100)) : 0;
    const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color;
    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:6px;">
          <span style="font-weight:600; text-transform:capitalize; color:var(--foreground);">${sanitizeHtml(key)}</span>
          <span style="color:var(--muted-foreground);">${val.current} / ${val.limit === 999 ? '∞' : val.limit}</span>
        </div>
        <div style="height:6px; background:var(--border); border-radius:4px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:4px; transition:width 0.6s ease;"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <div class="card-title">Subscription Quota</div>
        <span style="font-size:11px; font-weight:700; background:${color}22; color:${color}; padding:3px 10px; border-radius:20px; letter-spacing:0.05em;">${sanitizeHtml(plan)} PLAN</span>
      </div>
      <div class="card-body">
        ${barItems || '<div style="color:var(--muted-foreground); font-size:13px;">No quota data available.</div>'}
      </div>
    </div>
  `;
}

// ---- Multi-Branch Leaderboard ----
function drawBranchLeaderboard(): string {
  const branches = state.branchMetrics;
  if (!branches || branches.length === 0) return '';

  const sorted = [...branches].sort((a: any, b: any) => b.netProfit - a.netProfit);
  const rows = sorted.map((b: any, i: number) => {
    const rankColor = ['#f59e0b', '#9ca3af', '#cd7f32'][i] || 'var(--muted-foreground)';
    const profitColor = b.netProfit >= 0 ? '#10b981' : '#ef4444';
    return `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:12px 8px; font-size:18px; font-weight:800; color:${rankColor}; text-align:center;">#${i + 1}</td>
        <td style="padding:12px 8px;">
          <div style="font-weight:600; font-size:13px; color:var(--foreground);">${sanitizeHtml(b.name)}</div>
          <div style="font-size:11px; color:var(--muted-foreground);">${sanitizeHtml(b.location || '—')}</div>
        </td>
        <td style="padding:12px 8px; text-align:center; font-size:13px; font-weight:600;">${b.headcount}</td>
        <td style="padding:12px 8px; text-align:center; font-size:13px; font-weight:600;">${b.activeProjects}</td>
        <td style="padding:12px 8px; text-align:right; font-size:13px; font-weight:700; color:${profitColor};">${formatCurrency(b.netProfit)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card" style="margin-bottom:24px; overflow-x:auto;">
      <div class="card-header">
        <div class="card-title">Branch Performance Leaderboard</div>
        <span style="font-size:12px; color:var(--muted-foreground);">${sorted.length} Branch${sorted.length !== 1 ? 'es' : ''}</span>
      </div>
      <div class="card-body" style="padding:0;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:var(--border); font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted-foreground);">
              <th style="padding:10px 8px; text-align:center;">Rank</th>
              <th style="padding:10px 8px; text-align:left;">Branch</th>
              <th style="padding:10px 8px; text-align:center;">Staff</th>
              <th style="padding:10px 8px; text-align:center;">Projects</th>
              <th style="padding:10px 8px; text-align:right;">Net Profit</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="padding:20px; text-align:center; color:var(--muted-foreground);">No branch data available.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---- Financial Category Breakdown ----
function drawFinancialCategories(): string {
  const cats = state.transactionCategories;
  if (!cats) return '';

  const incomeItems = (cats.income || []).slice(0, 5);
  const expenseItems = (cats.expense || []).slice(0, 5);
  if (incomeItems.length === 0 && expenseItems.length === 0) return '';

  const totalIncome = incomeItems.reduce((s: number, i: any) => s + (i.value || 0), 0);
  const totalExpense = expenseItems.reduce((s: number, i: any) => s + (i.value || 0), 0);

  const makeBar = (items: any[], total: number, barColorBase: string) => items.map((item: any) => {
    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
          <span style="font-weight:600; color:var(--foreground);">${sanitizeHtml(item.category || 'Uncategorized')}</span>
          <span style="color:var(--muted-foreground);">${formatCurrency(item.value)} (${pct}%)</span>
        </div>
        <div style="height:5px; background:var(--border); border-radius:4px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${barColorBase}; border-radius:4px;"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="content-grid" style="margin-bottom:24px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="color:#10b981;">↓ Income by Category</div>
          <span style="font-size:12px; color:var(--muted-foreground);">${formatCurrency(totalIncome)} total</span>
        </div>
        <div class="card-body">
          ${makeBar(incomeItems, totalIncome, '#10b981') || '<div style="color:var(--muted-foreground); font-size:13px;">No income categories.</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title" style="color:#ef4444;">↑ Expenses by Category</div>
          <span style="font-size:12px; color:var(--muted-foreground);">${formatCurrency(totalExpense)} total</span>
        </div>
        <div class="card-body">
          ${makeBar(expenseItems, totalExpense, '#ef4444') || '<div style="color:var(--muted-foreground); font-size:13px;">No expense categories.</div>'}
        </div>
      </div>
    </div>
  `;
}



function drawDashboardSvgChart(): string {
  function smoothPath(points: { x: number; y: number }[]) {
    if (points.length < 2) return "";
    let d = `M ${(points.at(0) || {x:0, y:0}).x.toFixed(2)} ${(points.at(0) || {x:0, y:0}).y.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points.at(i - 1) || points.at(i) || { x: 0, y: 0 };
      const p1 = points.at(i) || { x: 0, y: 0 };
      const p2 = points.at(i + 1) || { x: 0, y: 0 };
      const p3 = points.at(i + 2) || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }

  function formatCurrencyShort(val: number): string {
    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'k';
    return Math.round(val).toString();
  }

  const res = {
    labels: [] as string[],
    income: [] as number[],
    expense: [] as number[],
  };

  if (state.chartRange === "7D") {
    res.labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    res.income = [0, 0, 0, 0, 0, 0, 0];
    res.expense = [0, 0, 0, 0, 0, 0, 0];

    state.transactions.forEach((tx: any) => {
      try {
        const amt = parseFloat(tx.amount) || 0;
        const d = new Date(Date.parse(tx.date + ", " + new Date().getFullYear()));
        if (!isNaN(d.getTime())) {
          const diffDays = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays < 7) {
            const dayIdx = (d.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
            if (tx.type === "income") {
              res.income[dayIdx] += amt;
            } else {
              res.expense[dayIdx] += amt;
            }
          }
        }
      } catch (e) {}
    });
  } else if (state.chartRange === "30D") {
    res.labels = ["W1", "W2", "W3", "W4"];
    res.income = [0, 0, 0, 0];
    res.expense = [0, 0, 0, 0];

    state.transactions.forEach((tx: any) => {
      try {
        const amt = parseFloat(tx.amount) || 0;
        const d = new Date(Date.parse(tx.date + ", " + new Date().getFullYear()));
        if (!isNaN(d.getTime())) {
          const diffDays = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays < 30) {
            const weekIdx = Math.min(3, Math.floor(diffDays / 7.5));
            const mappedIdx = 3 - weekIdx;
            if (tx.type === "income") {
              res.income[mappedIdx] += amt;
            } else {
              res.expense[mappedIdx] += amt;
            }
          }
        }
      } catch (e) {}
    });
  } else {
    // 12M
    res.labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    res.income = Array(12).fill(0);
    res.expense = Array(12).fill(0);

    state.transactions.forEach((tx: any) => {
      try {
        const amt = parseFloat(tx.amount) || 0;
        const d = new Date(Date.parse(tx.date + ", " + new Date().getFullYear()));
        if (!isNaN(d.getTime())) {
          const monthIdx = d.getMonth();
          if (tx.type === "income") {
            res.income[monthIdx] += amt;
          } else {
            res.expense[monthIdx] += amt;
          }
        }
      } catch (e) {}
    });
  }

  const profit = res.income.map((v, i) => v - (res.expense.at(i) || 0));
  const allValues = [...res.income, ...res.expense, ...profit];
  const rawMin = Math.min(...allValues, 0);
  const rawMax = Math.max(...allValues, 100);
  const yMin = Math.floor(rawMin / 10) * 10;
  const yMax = Math.ceil(rawMax / 10) * 10;

  const PADDING = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 500;
  const height = 240;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const xFor = (i: number) =>
    PADDING.left + (res.labels.length === 1 ? innerW / 2 : (innerW * i) / (res.labels.length - 1));
  const yFor = (v: number) =>
    PADDING.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const buildPoints = (arr: number[]) => arr.map((v, i) => ({ x: xFor(i), y: yFor(v) }));

  const incomePts = buildPoints(res.income);
  const expensePts = buildPoints(res.expense);
  const profitPts = buildPoints(profit);

  const incomePath = smoothPath(incomePts);
  const expensePath = smoothPath(expensePts);
  const profitPath = smoothPath(profitPts);

  const areaPath = incomePts.length > 0 ? (
    incomePath +
    ` L ${(incomePts.at(-1) || {x:0}).x.toFixed(2)} ${(PADDING.top + innerH).toFixed(2)} L ${(incomePts.at(0) || {x:0}).x.toFixed(2)} ${(PADDING.top + innerH).toFixed(2)} Z`
  ) : "";

  const totalIncome = res.income.reduce((s: number, v: number) => s + v, 0);
  const totalExpense = res.expense.reduce((s: number, v: number) => s + v, 0);
  const netProfit = totalIncome - totalExpense;

  const yTicks = [0, 0.33, 0.66, 1].map((t) => yMin + (yMax - yMin) * (1 - t));

  return `
    <div class="financial-pulse-widget" style="display:flex; flex-direction:column; gap:16px;">
      <!-- Styling Block -->
      <style>
        @keyframes breathing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .live-dot-pulse {
          animation: breathing 1.2s infinite ease-out;
          transform-origin: center;
        }
        .chart-point-group:hover .hover-dot {
          display: block !important;
        }
        .chart-point-group:hover .chart-tooltip-g {
          display: block !important;
        }
      </style>

      <!-- Header Row (breathing dot + title + range chips) -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="position:relative; width:12px; height:12px; display:flex; align-items:center; justify-content:center;">
            <div class="live-dot-pulse" style="position:absolute; width:12px; height:12px; border-radius:50%; background:#22c55e;"></div>
            <div style="width:6px; height:6px; border-radius:50%; background:#22c55e;"></div>
          </div>
          <span style="color:#22c55e; font-size:10px; font-weight:700; letter-spacing:1.2px;">LIVE</span>
          <h3 style="font-size:16px; font-weight:700; margin:0; margin-left:4px; color:var(--foreground);">Financial Pulse</h3>
        </div>
        
        <!-- Range chips -->
        <div style="display:flex; gap:6px;">
          ${['7D', '30D', '12M'].map(r => {
            const active = state.chartRange === r;
            return `
              <button id="dash-range-${r}" style="
                padding: 5px 12px;
                border-radius: 999px;
                border: 1px solid ${active ? 'var(--accent)' : 'var(--border)'};
                background: ${active ? 'var(--accent)' : 'transparent'};
                color: ${active ? '#fff' : 'var(--muted-foreground)'};
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              ">${r}</button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Summary Row (Pills) -->
      <div style="display:flex; gap:16px; align-items:flex-end; padding: 4px 0;">
        <!-- Net Profit Pill -->
        <div style="flex:1.2; min-width:0;">
          <div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;">
            <div style="width:7px; height:7px; border-radius:50%; background:#f97316;"></div>
            <span style="color:var(--muted-foreground); font-size:10px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Net</span>
          </div>
          <div style="color:var(--foreground); font-size:22px; font-weight:800; font-variant-numeric:tabular-nums; letter-spacing:-0.5px;">${formatCurrency(netProfit)}</div>
        </div>
        <!-- Income Pill -->
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;">
            <div style="width:7px; height:7px; border-radius:50%; background:#22c55e;"></div>
            <span style="color:var(--muted-foreground); font-size:10px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">In</span>
          </div>
          <div style="color:var(--foreground); font-size:14px; font-weight:700; font-variant-numeric:tabular-nums;">${formatCurrency(totalIncome)}</div>
        </div>
        <!-- Expense Pill -->
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:5px; margin-bottom:2px;">
            <div style="width:7px; height:7px; border-radius:50%; background:#ef4444;"></div>
            <span style="color:var(--muted-foreground); font-size:10px; text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Out</span>
          </div>
          <div style="color:var(--foreground); font-size:14px; font-weight:700; font-variant-numeric:tabular-nums;">${formatCurrency(totalExpense)}</div>
        </div>
      </div>

      <!-- Chart SVG -->
      <div style="width:100%; overflow-x:auto; margin-top:8px;">
        <svg viewBox="0 0 500 240" style="width:100%; min-width:400px; display:block;">
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#22c55e" stop-opacity="0.18"></stop>
              <stop offset="100%" stop-color="#22c55e" stop-opacity="0.00"></stop>
            </linearGradient>
          </defs>

          <!-- Grid Lines -->
          ${yTicks.map(tv => {
            const y = yFor(tv);
            return `
              <line x1="${PADDING.left}" x2="${500 - PADDING.right}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-dasharray="3" stroke-width="1"></line>
              <text x="${PADDING.left - 8}" y="${y + 4}" fill="var(--muted-foreground)" font-size="9.5" font-weight="600" text-anchor="end">${formatCurrencyShort(tv)}</text>
            `;
          }).join('')}

          <line x1="${PADDING.left}" x2="${500 - PADDING.right}" y1="${height - PADDING.bottom}" y2="${height - PADDING.bottom}" stroke="var(--border)" stroke-width="1.5"></line>

          <!-- Area Fill for Income -->
          ${areaPath ? `<path d="${areaPath}" fill="url(#incomeFill)"></path>` : ''}

          <!-- Curves -->
          ${expensePath ? `<path d="${expensePath}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>` : ''}
          ${profitPath ? `<path d="${profitPath}" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>` : ''}
          ${incomePath ? `<path d="${incomePath}" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>` : ''}

          <!-- Pulsing Pin Points for Last Coordinates -->
          ${[
            { last: incomePts.at(-1), color: '#22c55e' },
            { last: profitPts.at(-1), color: '#f97316' },
            { last: expensePts.at(-1), color: '#ef4444' }
          ].map(s => {
            if (!s.last) return '';
            return `
              <g>
                <circle cx="${s.last.x}" cy="${s.last.y}" r="7" fill="${s.color}" opacity="0.35" class="live-dot-pulse"></circle>
                <circle cx="${s.last.x}" cy="${s.last.y}" r="3.5" fill="${s.color}" stroke="var(--background)" stroke-width="1.5"></circle>
              </g>
            `;
          }).join('')}

          <!-- Tooltip Interactive Circles & Groups -->
          ${res.labels.map((lab, i) => {
            const incP = incomePts.at(i);
            const expP = expensePts.at(i);
            const prfP = profitPts.at(i);
            if (!incP || !expP || !prfP) return '';
            const tooltipY = Math.min(incP.y, expP.y, prfP.y);
            return `
              <g class="chart-point-group">
                <!-- Invisible hit target column -->
                <rect x="${incP.x - 15}" y="${PADDING.top}" width="30" height="${innerH}" fill="transparent"></rect>
                
                <!-- Bullet points shown on hover -->
                <circle cx="${incP.x}" cy="${incP.y}" r="4" fill="#22c55e" stroke="var(--background)" stroke-width="1.5" style="display:none;" class="hover-dot"></circle>
                <circle cx="${expP.x}" cy="${expP.y}" r="4" fill="#ef4444" stroke="var(--background)" stroke-width="1.5" style="display:none;" class="hover-dot"></circle>
                <circle cx="${prfP.x}" cy="${prfP.y}" r="4" fill="#f97316" stroke="var(--background)" stroke-width="1.5" style="display:none;" class="hover-dot"></circle>
                
                <g class="chart-tooltip-g" style="display:none; pointer-events:none;">
                  <rect x="${incP.x - 65}" y="${tooltipY - 62}" width="130" height="52" rx="6" fill="var(--foreground)" opacity="0.96" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"></rect>
                  <text x="${incP.x}" y="${tooltipY - 48}" fill="var(--background)" font-size="9" font-weight="700" text-anchor="middle">${lab}</text>
                  <text x="${incP.x}" y="${tooltipY - 36}" fill="#22c55e" font-size="8.5" font-weight="700" text-anchor="middle">In: ${formatCurrency(res.income.at(i) || 0)}</text>
                  <text x="${incP.x}" y="${tooltipY - 24}" fill="#ef4444" font-size="8.5" font-weight="700" text-anchor="middle">Out: ${formatCurrency(res.expense.at(i) || 0)}</text>
                  <text x="${incP.x}" y="${tooltipY - 14}" fill="#f97316" font-size="8.5" font-weight="700" text-anchor="middle">Net: ${formatCurrency(profit.at(i) || 0)}</text>
                </g>
              </g>
            `;
          }).join('')}

          <!-- X Axis Labels -->
          ${res.labels.map((lab, i) => `
            <text x="${xFor(i)}" y="${height - 8}" fill="var(--muted-foreground)" font-size="9.5" font-weight="600" text-anchor="middle">${lab}</text>
          `).join('')}
        </svg>
      </div>

      <!-- Legend Row -->
      <div style="display:flex; justify-content:center; gap:20px; margin-top:4px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="width:8px; height:8px; border-radius:50%; background:#22c55e;"></div>
          <span style="color:var(--muted-foreground); font-size:11px; font-weight:600;">Income</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="width:8px; height:8px; border-radius:50%; background:#ef4444;"></div>
          <span style="color:var(--muted-foreground); font-size:11px; font-weight:600;">Expense</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="width:8px; height:8px; border-radius:50%; background:#f97316;"></div>
          <span style="color:var(--muted-foreground); font-size:11px; font-weight:600;">Net Profit</span>
        </div>
      </div>
    </div>
  `;
}

function bindDashboardEvents() {
  const viewFinance = document.getElementById('view-finance-card-btn');
  if (viewFinance) viewFinance.addEventListener('click', () => navigateToTab('finance'));

  // Quick Action triggers
  const addStaff = document.getElementById('qa-add-staff');
  if (addStaff) addStaff.addEventListener('click', () => { navigateToTab('employees'); openAddEmployeeModal(); });

  const addCli = document.getElementById('qa-add-client');
  if (addCli) addCli.addEventListener('click', () => { navigateToTab('clients'); openAddClientModal(); });

  const logCost = document.getElementById('qa-log-cost');
  if (logCost) logCost.addEventListener('click', () => { navigateToTab('finance'); openAddTransactionModal(); });

  const settings = document.getElementById('qa-settings');
  if (settings) settings.addEventListener('click', () => navigateToTab('settings'));

  // Range selector clicks
  ['7D', '30D', '12M'].forEach(r => {
    const el = document.getElementById(`dash-range-${r}`);
    if (el) {
      el.addEventListener('click', () => {
        state.chartRange = r as any;
        renderApp();
      });
    }
  });

  // Chart Tooltips
  document.querySelectorAll('.chart-point-group').forEach(grp => {
    grp.addEventListener('mouseenter', (e) => {
      const tooltip = (e.currentTarget as HTMLElement).querySelector('.chart-tooltip-g') as HTMLElement;
      if (tooltip) tooltip.style.display = 'block';
      const hoverDots = (e.currentTarget as HTMLElement).querySelectorAll('.hover-dot');
      hoverDots.forEach((hd: any) => hd.style.display = 'block');
    });
    grp.addEventListener('mouseleave', (e) => {
      const tooltip = (e.currentTarget as HTMLElement).querySelector('.chart-tooltip-g') as HTMLElement;
      if (tooltip) tooltip.style.display = 'none';
      const hoverDots = (e.currentTarget as HTMLElement).querySelectorAll('.hover-dot');
      hoverDots.forEach((hd: any) => hd.style.display = 'none');
    });
  });

  // Dashboard Interactive Tour — triggers on first dashboard visit
  if (dashboardTourStep >= 0) {
    // Tour in progress, re-render current step after DOM settles
    setTimeout(() => renderDashboardTourStep(), 150);
  } else if (shouldShowDashboardTour()) {
    // First visit — start tour after UI settles
    setTimeout(() => startDashboardTour(), 800);
  }
}

// ------------------------------------------------------------
// 8B. EMPLOYEES TAB VIEW
// ------------------------------------------------------------

let employeeSearchQuery = '';
let employeeDeptFilter = 'All';

function drawEmployeesTab(): string {
  const departments = ['All', 'Engineering', 'Product', 'HR', 'Support'];
  
  const filtered = state.employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                          e.role.toLowerCase().includes(employeeSearchQuery.toLowerCase()) ||
                          e.email.toLowerCase().includes(employeeSearchQuery.toLowerCase());
    const matchesDept = employeeDeptFilter === 'All' || e.department === employeeDeptFilter;
    return matchesSearch && matchesDept;
  });

  const chipsHtml = departments.map(d => `
    <button class="chip ${employeeDeptFilter === d ? 'active' : ''}" data-dept="${sanitizeHtml(d)}">${sanitizeHtml(d)}</button>
  `).join('');

  const rowsHtml = filtered.map(e => `
    <tr style="cursor: pointer;" data-employee-id="${e.id}">
      <td>
        <div class="user-row">
          <div class="avatar blue">${sanitizeHtml(e.initials || e.name[0] || 'E')}</div>
          <div>
            <div class="cell-primary">${sanitizeHtml(e.name)}</div>
            <div class="cell-muted">${sanitizeHtml(e.email)}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="cell-primary">${sanitizeHtml(e.role)}</div>
        <div class="cell-muted">${sanitizeHtml(e.department)}</div>
      </td>
      <td class="cell-mono">${formatCurrency(e.salary)}/mo</td>
      <td>
        <span class="status-badge ${e.status === 'active' ? 'active' : 'inactive'}">
          ${sanitizeHtml(e.status)}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div class="search-box">
        ${getIconSvg('search')}
        <input type="text" class="form-input" id="employee-search" placeholder="Search staff..." value="${sanitizeHtml(employeeSearchQuery)}">
      </div>
      <button class="btn btn-primary" id="add-employee-btn">
        ${getIconSvg('plus')} Add Member
      </button>
    </div>
    
    <div class="filter-chips">
      ${chipsHtml}
    </div>
    
    <div class="card" style="overflow-x: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Designation</th>
            <th>Compensation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--muted-foreground)">No employees found.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function bindEmployeesEvents() {
  const search = document.getElementById('employee-search') as HTMLInputElement;
  if (search) {
    search.addEventListener('input', (e) => {
      employeeSearchQuery = (e.target as HTMLInputElement).value;
      
      clearTimeout((window as any).empSearchTimeout);
      (window as any).empSearchTimeout = setTimeout(() => {
        renderApp();
        const next = document.getElementById('employee-search') as HTMLInputElement;
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      }, 150);
    });
  }

  document.querySelectorAll('.filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      employeeDeptFilter = (e.currentTarget as HTMLButtonElement).dataset.dept || 'All';
      renderApp();
    });
  });

  document.querySelectorAll('.data-table tbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.employeeId;
      if (id) openEmployeeDetailModal(parseInt(id));
    });
  });

  const addBtn = document.getElementById('add-employee-btn');
  if (addBtn) addBtn.addEventListener('click', openAddEmployeeModal);
}

function openEmployeeDetailModal(id: number) {
  const emp = state.employees.find(e => e.id === id);
  if (!emp) return;

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Staff File Details</h2>
          <button class="modal-close" id="modal-close-btn">${getIconSvg('x')}</button>
        </div>
        <div class="modal-body">
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:24px;">
            <div class="avatar blue" style="width:64px; height:64px; font-size:24px;">${sanitizeHtml(emp.name[0])}</div>
            <div>
              <h2 style="font-size:18px; font-weight:700;">${sanitizeHtml(emp.name)}</h2>
              <p style="color:var(--muted-foreground); font-size:13px;">${sanitizeHtml(emp.role)} · ${sanitizeHtml(emp.department)}</p>
            </div>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:12px; font-size:14px; margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Direct Email</span>
              <span style="font-weight:600;">${sanitizeHtml(emp.email)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Contact Phone</span>
              <span style="font-weight:600;">${sanitizeHtml(emp.phone || 'N/A')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Location</span>
              <span style="font-weight:600;">${sanitizeHtml(emp.location || 'N/A')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Compensation</span>
              <span style="font-weight:700;">${formatCurrency(emp.salary)} / mo</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span style="color:var(--muted-foreground);">Activity Status</span>
              <span class="status-badge ${emp.status === 'active' ? 'active' : 'inactive'}">${sanitizeHtml(emp.status)}</span>
            </div>
          </div>
          
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <button class="btn btn-danger btn-sm" id="delete-employee-modal-btn">Delete Profile</button>
            ${['PRO','PRO_YEARLY'].includes(state.subscriptionLimits?.plan || '') ? `<button class="btn btn-primary btn-sm" id="edit-finance-modal-btn">Edit Financials</button>` : `<button class="btn btn-outline btn-sm" id="upgrade-to-edit-finance-btn" title="Upgrade to PRO to edit financials" style="opacity:0.7;">🔒 PRO Feature</button>`}
            <button class="btn btn-outline btn-sm" id="toggle-status-modal-btn">
              Toggle to ${emp.status === 'active' ? 'Inactive' : 'Active'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  const close = () => modalContainer.innerHTML = DOMPurify.sanitize('');
  document.getElementById('modal-close-btn')?.addEventListener('click', close);

  // Edit employee financials (PRO gate)
  document.getElementById('edit-finance-modal-btn')?.addEventListener('click', () => {
    openEditFinanceModal(emp);
  });
  document.getElementById('upgrade-to-edit-finance-btn')?.addEventListener('click', () => {
    close();
    navigateToTab('pricing');
    showToast('Upgrade to PRO to unlock financial editing', 'info');
  });

  // Toggle employee status
  document.getElementById('toggle-status-modal-btn')?.addEventListener('click', async () => {
    const nextStatus = emp.status === 'active' ? 'inactive' : 'active';
    try {
      await apiRequest(`employees/${emp.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          name: emp.name,
          role: emp.role,
          department: emp.department,
          salary: emp.salary,
          email: emp.email,
          status: nextStatus
        })
      });
      showToast(`${emp.name} updated successfully!`, 'success');
      close();
      await syncAppData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  });

  // Purge/delete profile
  document.getElementById('delete-employee-modal-btn')?.addEventListener('click', async () => {
    try {
      await apiRequest(`employees/${emp.id}/`, {
        method: 'DELETE'
      });
      showToast('Employee profile removed successfully', 'error');
      close();
      await syncAppData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Purging failed', 'error');
    }
  });
}

function openEditFinanceModal(emp: Employee) {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay">
      <div class="modal" style="max-width: 480px;">
        <div class="modal-header">
          <h2 class="modal-title">Edit Financial Record: ${sanitizeHtml(emp.name)}</h2>
          <button class="modal-close" id="modal-close-btn">${getIconSvg('x')}</button>
        </div>
        
        <form id="edit-finance-form">
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
            <div class="form-group">
              <label class="form-label" for="fin-salary">Base Salary (Monthly)</label>
              <input type="number" step="0.01" class="form-input" id="fin-salary" required value="${emp.salary || 0}">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="fin-bonuses">Accumulated Bonuses</label>
                <input type="number" step="0.01" class="form-input" id="fin-bonuses" required value="${emp.finance?.bonuses || 0}">
              </div>
              <div class="form-group">
                <label class="form-label" for="fin-deductions">Deductions</label>
                <input type="number" step="0.01" class="form-input" id="fin-deductions" required value="${emp.finance?.deductions || 0}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="fin-shares">Equity Shares (%)</label>
              <input type="number" step="0.01" min="0" max="100" class="form-input" id="fin-shares" required value="${emp.finance?.shares || 0}">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="fin-owes-company">Owed to Company</label>
                <input type="number" step="0.01" class="form-input" id="fin-owes-company" required value="${emp.finance?.employee_owes_company || 0}">
              </div>
              <div class="form-group">
                <label class="form-label" for="fin-owes-employee">Owed to Employee</label>
                <input type="number" step="0.01" class="form-input" id="fin-owes-employee" required value="${emp.finance?.company_owes_employee || 0}">
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="fin-submit-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const close = () => {
    openEmployeeDetailModal(emp.id);
  };
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);

  const form = document.getElementById('edit-finance-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const salary = parseFloat((document.getElementById('fin-salary') as HTMLInputElement).value);
    const bonuses = parseFloat((document.getElementById('fin-bonuses') as HTMLInputElement).value);
    const deductions = parseFloat((document.getElementById('fin-deductions') as HTMLInputElement).value);
    const shares = parseFloat((document.getElementById('fin-shares') as HTMLInputElement).value);
    const employee_owes_company = parseFloat((document.getElementById('fin-owes-company') as HTMLInputElement).value);
    const company_owes_employee = parseFloat((document.getElementById('fin-owes-employee') as HTMLInputElement).value);

    try {
      await apiRequest(`employees/${emp.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          salary: salary,
          finance_data: {
            current_pay: salary,
            bonuses: bonuses,
            deductions: deductions,
            shares: shares,
            employee_owes_company: employee_owes_company,
            company_owes_employee: company_owes_employee
          }
        })
      });
      showToast('Financial record updated successfully!', 'success');
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) modalContainer.innerHTML = DOMPurify.sanitize('');
      await syncAppData();
      openEmployeeDetailModal(emp.id);
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to update financials', 'error');
    }
  });
}

function openAddEmployeeModal() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Onboard New Team Member</h2>
          <button class="modal-close" id="modal-close-btn">${getIconSvg('x')}</button>
        </div>
        
        <form id="add-employee-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="emp-name">Full Name</label>
              <input type="text" class="form-input" id="emp-name" required placeholder="Alexander Mercer">
            </div>
            
            <div class="form-group">
              <label class="form-label" for="emp-email">Email Address</label>
              <input type="email" class="form-input" id="emp-email" required placeholder="alex@company.com">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="emp-role">Designation</label>
                <select class="form-input" id="emp-role" style="background-color: var(--background);">
                  <option value="Employee">Employee</option>
                  <option value="New Admin">New Admin</option>
                  <option value="HR Manager">HR Manager</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Finance Officer">Finance Officer</option>
                  <option value="Operational Officer">Operational Officer</option>
                  <option value="Department Manager">Department Manager</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-dept">Department</label>
                <select class="form-input" id="emp-dept" style="background-color: var(--background);">
                  <option>Engineering</option>
                  <option>Product</option>
                  <option>HR</option>
                  <option>Support</option>
                  <option>Finance</option>
                  <option>Operations</option>
                </select>
              </div>
            </div>

            <!-- New Admin Branch Configuration (Hidden by default) -->
            <div id="admin-branch-section" style="display: none; border: 1px dashed var(--border); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px; background: rgba(0,0,0,0.1);">
              <div class="form-group" style="margin-bottom: 10px;">
                <label class="form-label">Admin Scope Type</label>
                <div style="display: flex; gap: 16px; margin-top: 4px;">
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="admin-type" value="current" checked> Add to Current Admin Space
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                    <input type="radio" name="admin-type" value="new"> Admin to a New Branch Space
                  </label>
                </div>
              </div>
              
              <div id="new-branch-fields" style="display: none; margin-top: 10px;">
                <div class="form-row">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" for="branch-name">New Branch Name</label>
                    <input type="text" class="form-input" id="branch-name" placeholder="e.g. West Coast Branch">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" for="branch-location">Branch Location</label>
                    <input type="text" class="form-input" id="branch-location" placeholder="e.g. Los Angeles, CA">
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="emp-salary">Base Salary (Monthly)</label>
                <input type="number" class="form-input" id="emp-salary" required placeholder="6500">
              </div>
              <div class="form-group">
                <label class="form-label" for="emp-phone">Phone Number</label>
                ${drawPhoneInput('emp-phone', '', 'e.g. 555-0199')}
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="emp-submit-btn">Save Member</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const close = () => modalContainer.innerHTML = DOMPurify.sanitize('');
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);

  // Dynamic show/hide of Admin Scope configurations
  const empRoleSelect = document.getElementById('emp-role') as HTMLSelectElement;
  const adminBranchSection = document.getElementById('admin-branch-section') as HTMLElement;
  const newBranchFields = document.getElementById('new-branch-fields') as HTMLElement;

  if (empRoleSelect && adminBranchSection) {
    empRoleSelect.addEventListener('change', () => {
      if (empRoleSelect.value === 'New Admin') {
        adminBranchSection.style.display = 'block';
      } else {
        adminBranchSection.style.display = 'none';
      }
    });
  }

  const adminTypeRadios = document.getElementsByName('admin-type');
  adminTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (val === 'new') {
        newBranchFields.style.display = 'block';
        (document.getElementById('branch-name') as HTMLInputElement).required = true;
        (document.getElementById('branch-location') as HTMLInputElement).required = true;
      } else {
        newBranchFields.style.display = 'none';
        (document.getElementById('branch-name') as HTMLInputElement).required = false;
        (document.getElementById('branch-location') as HTMLInputElement).required = false;
      }
    });
  });

  // Bind phone input events
  const empPhoneInput = document.getElementById('emp-phone') as HTMLInputElement;
  const initialCountry = getSelectedCountry('emp-phone');
  let empPhoneVal = initialCountry.dial + (empPhoneInput?.value || '');
  bindPhoneInputEvents('emp-phone', (fullVal) => {
    empPhoneVal = fullVal;
  });

  const form = document.getElementById('add-employee-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('emp-submit-btn') as HTMLButtonElement;

    const name = (document.getElementById('emp-name') as HTMLInputElement).value;
    const email = (document.getElementById('emp-email') as HTMLInputElement).value;
    const role = (document.getElementById('emp-role') as HTMLSelectElement).value;
    const department = (document.getElementById('emp-dept') as HTMLSelectElement).value;
    const salary = parseFloat((document.getElementById('emp-salary') as HTMLInputElement).value);

    let branch_name = '';
    let branch_location = '';
    
    if (role === 'New Admin') {
      const selectedType = (document.querySelector('input[name="admin-type"]:checked') as HTMLInputElement)?.value;
      if (selectedType === 'new') {
        branch_name = (document.getElementById('branch-name') as HTMLInputElement).value.trim();
        branch_location = (document.getElementById('branch-location') as HTMLInputElement).value.trim();
      }
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Saving...';

    const selectedCountry = _phoneCountryState.get('emp-phone') || 'US';
    const phoneCheck = validateAndFormatPhone(empPhoneVal, selectedCountry);
    if (!phoneCheck.isValid) {
      showToast('Please enter a valid phone number', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Save Member';
      return;
    }

    try {
      await apiRequest('employees/', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          role,
          department,
          salary,
          phone: phoneCheck.formatted,
          status: 'active',
          branch_name,
          branch_location
        })
      });

      showToast(`${name} onboarded successfully!`, 'success');
      close();
      await syncAppData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to onboard member', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Save Member';
    }
  });
}

// ------------------------------------------------------------
// 8C. CLIENTS TAB VIEW
// ------------------------------------------------------------

let clientSearchQuery = '';
let clientStatusFilter = 'All';

function drawClientsTab(): string {
  const statuses = ['All', 'active', 'pending', 'completed'];

  const filtered = state.clients.filter(c => {
    const matchesSearch = c.company.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                          c.contact.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(clientSearchQuery.toLowerCase());
    const matchesStatus = clientStatusFilter === 'All' || c.status === clientStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const chipsHtml = statuses.map(s => `
    <button class="chip ${clientStatusFilter === s ? 'active' : ''}" data-status="${s}">${s.toUpperCase()}</button>
  `).join('');

  const cardsHtml = filtered.map(c => `
    <div class="stat-card" style="cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; min-height: 160px;" data-client-id="${c.id}">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <span style="font-weight:700; font-size:16px;">${sanitizeHtml(c.company)}</span>
          <span class="status-badge ${c.status === 'active' ? 'active' : c.status === 'pending' ? 'pending' : 'completed'}">${sanitizeHtml(c.status)}</span>
        </div>
        <div style="font-size:13px; color:var(--muted-foreground); margin-bottom:4px;">Lead Account: ${sanitizeHtml(c.contact)}</div>
        <div style="font-size:12px; color:var(--muted-foreground);">${sanitizeHtml(c.email)}</div>
      </div>
      <div style="margin-top:16px; border-top:1px solid var(--border); padding-top:12px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:11px; font-weight:600; text-transform:uppercase; color:var(--muted-foreground);">Retainer Contract</span>
        <span style="font-size:16px; font-weight:700; color:var(--accent); font-variant-numeric: tabular-nums;">${formatCurrency(c.lifetime_value)}</span>
      </div>
    </div>
  `).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div class="search-box">
        ${getIconSvg('search')}
        <input type="text" class="form-input" id="client-search" placeholder="Search clients..." value="${clientSearchQuery}">
      </div>
      <button class="btn btn-primary" id="add-client-btn">
        ${getIconSvg('plus')} Add Client
      </button>
    </div>
    
    <div class="filter-chips">
      ${chipsHtml}
    </div>
    
    <div class="stats-grid">
      ${cardsHtml || '<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--muted-foreground)">No clients match this filter.</div>'}
    </div>
  `;
}

function bindClientsEvents() {
  const search = document.getElementById('client-search') as HTMLInputElement;
  if (search) {
    search.addEventListener('input', (e) => {
      clientSearchQuery = (e.target as HTMLInputElement).value;
      clearTimeout((window as any).cliSearchTimeout);
      (window as any).cliSearchTimeout = setTimeout(() => {
        renderApp();
        const next = document.getElementById('client-search') as HTMLInputElement;
        if (next) {
          next.focus();
          next.setSelectionRange(next.value.length, next.value.length);
        }
      }, 150);
    });
  }

  document.querySelectorAll('.filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      clientStatusFilter = (e.currentTarget as HTMLButtonElement).dataset.status || 'All';
      renderApp();
    });
  });

  document.querySelectorAll('[data-client-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.clientId;
      if (id) openClientDetailModal(parseInt(id));
    });
  });

  const addBtn = document.getElementById('add-client-btn');
  if (addBtn) addBtn.addEventListener('click', openAddClientModal);
}

function openClientDetailModal(id: number) {
  const client = state.clients.find(c => c.id === id);
  if (!client) return;

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Client Portfolio Profile</h2>
          <button class="modal-close" id="modal-close-btn">${getIconSvg('x')}</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 24px;">
            <h1 style="font-size:22px; font-weight:700; letter-spacing:-0.5px;">${client.company}</h1>
            <p style="color:var(--muted-foreground); font-size:13px; margin-top:2px;">Lead Representative: ${client.contact}</p>
          </div>
          
          <div style="display:flex; flex-direction:column; gap:12px; font-size:14px; margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Contact Address</span>
              <span style="font-weight:600;">${client.email}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">HQ Location</span>
              <span style="font-weight:600;">${client.location || 'N/A'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Total Retainer Worth</span>
              <span style="font-weight:700; color:var(--accent);">${formatCurrency(client.lifetime_value)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding-bottom:8px;">
              <span style="color:var(--muted-foreground);">Client Status</span>
              <span class="status-badge ${client.status === 'active' ? 'active' : client.status === 'pending' ? 'pending' : 'completed'}">${client.status}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <span style="color:var(--muted-foreground);">Client File Records & Notes</span>
              <div style="background:var(--muted); padding:10px; border-radius:var(--radius-sm); font-size:12px; line-height:1.5;">
                ${client.description || 'No notes currently attached to this account record.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);

  const close = () => modalContainer.innerHTML = DOMPurify.sanitize('');
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
}

function openAddClientModal() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Onboard New Enterprise Client</h2>
          <button class="modal-close" id="modal-close-btn">${getIconSvg('x')}</button>
        </div>
        
        <form id="add-client-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="cli-company">Company Corporate Name</label>
              <input type="text" class="form-input" id="cli-company" required placeholder="Oscorp Dynamics">
            </div>
            
            <div class="form-group">
              <label class="form-label" for="cli-name">Key Account Manager</label>
              <input type="text" class="form-input" id="cli-name" required placeholder="Norman Osborn">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cp-cli-email">Corporate Email</label>
                <input type="email" class="form-input" id="cp-cli-email" required placeholder="ceo@oscorp.com">
              </div>
              <div class="form-group">
                <label class="form-label" for="cli-location">HQ Location</label>
                <input type="text" class="form-input" id="cli-location" required placeholder="New York, NY">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cli-value">Retainer Value (USD)</label>
                <input type="number" class="form-input" id="cli-value" required placeholder="75000">
              </div>
              <div class="form-group">
                <label class="form-label" for="cli-status">Account Stage</label>
                <select class="form-input" id="cli-status" style="background-color: var(--background);">
                  <option value="active">Active</option>
                  <option value="pending">Pending Review</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="cli-notes">Account Brief & Project Notes</label>
              <textarea class="form-input" id="cli-notes" rows="3" placeholder="Identify software constraints and milestones..."></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="cli-submit-btn">Onboard Account</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const close = () => modalContainer.innerHTML = DOMPurify.sanitize('');
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);

  const form = document.getElementById('add-client-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('cli-submit-btn') as HTMLButtonElement;

    const company = (document.getElementById('cli-company') as HTMLInputElement).value;
    const contact = (document.getElementById('cli-name') as HTMLInputElement).value;
    const email = (document.getElementById('cp-cli-email') as HTMLInputElement).value;
    const location = (document.getElementById('cli-location') as HTMLInputElement).value;
    const lifetime_value = parseFloat((document.getElementById('cli-value') as HTMLInputElement).value);
    const status = (document.getElementById('cli-status') as HTMLSelectElement).value;
    const description = (document.getElementById('cli-notes') as HTMLTextAreaElement).value;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Saving...';

    try {
      await apiRequest('clients/', {
        method: 'POST',
        body: JSON.stringify({
          company,
          contact,
          email,
          location,
          lifetime_value,
          status,
          description
        })
      });

      showToast(`${company} signed successfully!`, 'success');
      close();
      await syncAppData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to onboard client', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Onboard Account';
    }
  });
}

// ------------------------------------------------------------
// 8D. FINANCE TAB VIEW
// ------------------------------------------------------------

function drawFinanceTab(): string {
  // Budget Category bars
  const budgetsHtml = state.budgets.map(b => {
    const allocated = parseFloat(b.allocated as any) || 1;
    const spent = parseFloat(b.spent as any) || 0;
    const pct = Math.min(100, Math.round((spent / allocated) * 100));
    
    return `
      <div style="margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:6px;">
          <span>${sanitizeHtml(b.name)}</span>
          <span style="font-variant-numeric: tabular-nums">${formatCurrency(spent)} / ${formatCurrency(allocated)} (${pct}%)</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${b.color || 'blue'}" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  // Debts List
  const debts = state.debtsGrouped || { weOwe: [], owedToUs: [] };
  const weOweHtml = debts.weOwe.map(d => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
      <div>
        <div style="font-weight:600; font-size:13px;">${sanitizeHtml(d.party)}</div>
        <div style="font-size:11px; color:var(--muted-foreground); margin-top:2px;">Due: ${sanitizeHtml(d.due || 'N/A')}</div>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <span class="status-badge pending">We Owe</span>
        <span style="font-weight:700; font-size:14px; font-variant-numeric: tabular-nums;">${formatCurrency(d.amount)}</span>
      </div>
    </div>
  `).join('');

  const owedToUsHtml = debts.owedToUs.map(d => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border);">
      <div>
        <div style="font-weight:600; font-size:13px;">${sanitizeHtml(d.party)}</div>
        <div style="font-size:11px; color:var(--muted-foreground); margin-top:2px;">Due: ${sanitizeHtml(d.due || 'N/A')}</div>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <span class="status-badge active">Owed To Us</span>
        <span style="font-weight:700; font-size:14px; font-variant-numeric: tabular-nums;">${formatCurrency(d.amount)}</span>
      </div>
    </div>
  `).join('');

  // Transactions logs list
  const transactionsHtml = state.transactions.map(t => {
    const isIncome = t.type === 'income';
    return `
      <div class="transaction-item" style="padding:10px 0;">
        <div class="transaction-info">
          <div class="transaction-icon ${isIncome ? 'income' : 'expense'}">${isIncome ? '↓' : '↑'}</div>
          <div>
            <div class="transaction-name">${t.description}</div>
            <div class="transaction-date">${t.category} · ${new Date(t.date).toLocaleDateString()}</div>
          </div>
        </div>
        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; justify-content:flex-end; margin-bottom:24px;">
      <button class="btn btn-primary" id="add-transaction-btn">
        ${getIconSvg('plus')} Log Transaction
      </button>
    </div>
    
    <div class="content-grid">
      <!-- Budget Trackers -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Expense Budgets</div>
        </div>
        <div class="card-body">
          ${budgetsHtml || '<div style="text-align:center; padding:20px; color:var(--muted-foreground)">No budgets configured.</div>'}
        </div>
      </div>
      
      <!-- Receivables & Liabilities -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Receivables & Liabilities</div>
        </div>
        <div class="card-body" style="display:flex; flex-direction:column; gap:4px; max-height: 300px; overflow-y: auto;">
          ${weOweHtml}
          ${owedToUsHtml}
          ${(!weOweHtml && !owedToUsHtml) ? '<div style="text-align:center; padding:20px; color:var(--muted-foreground)">No liabilities recorded.</div>' : ''}
        </div>
      </div>
    </div>
    
    <!-- Ledger Sheet -->
    <div class="card" style="margin-bottom:28px;">
      <div class="card-header">
        <div class="card-title">Corporate Financial Ledger</div>
      </div>
      <div class="card-body" style="padding: 10px 20px;">
        ${transactionsHtml || '<div style="text-align:center; padding:32px; color:var(--muted-foreground)">No ledger entries committed.</div>'}
      </div>
    </div>
  `;
}

function bindFinanceEvents() {
  document.getElementById('add-transaction-btn')?.addEventListener('click', openAddTransactionModal);
}

function openAddTransactionModal() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Log Financial Ledger Event</h2>
          <button class="modal-close" id="modal-close-btn">${getIconSvg('x')}</button>
        </div>
        
        <form id="add-transaction-form">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label" for="tx-desc">Description</label>
              <input type="text" class="form-input" id="tx-desc" required placeholder="AWS Hosting Renewal Fee">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="tx-amount">Amount (USD)</label>
                <input type="number" class="form-input" id="tx-amount" required placeholder="450">
              </div>
              <div class="form-group">
                <label class="form-label" for="tx-type">Flow Direction</label>
                <select class="form-input" id="tx-type" style="background-color: var(--background);">
                  <option value="expense">Outflow (Expense)</option>
                  <option value="income">Inflow (Income)</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label" for="tx-cat">Category</label>
              <input type="text" class="form-input" id="tx-cat" required placeholder="Tech Infrastructure">
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="tx-submit-btn">Commit Ledger</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const close = () => modalContainer.innerHTML = DOMPurify.sanitize('');
  document.getElementById('modal-close-btn')?.addEventListener('click', close);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', close);

  const form = document.getElementById('add-transaction-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('tx-submit-btn') as HTMLButtonElement;

    const description = (document.getElementById('tx-desc') as HTMLInputElement).value;
    const amount = parseFloat((document.getElementById('tx-amount') as HTMLInputElement).value);
    const type = (document.getElementById('tx-type') as HTMLSelectElement).value;
    const category = (document.getElementById('tx-cat') as HTMLInputElement).value;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Committing...';

    try {
      await apiRequest('transactions/', {
        method: 'POST',
        body: JSON.stringify({
          description,
          amount,
          type,
          category,
          date: new Date().toISOString()
        })
      });

      showToast('Ledger event committed successfully!', 'success');
      close();
      await syncAppData();
      renderApp();
    } catch (err: any) {
      showToast(err.message || 'Failed to record transaction', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Commit Ledger';
    }
  });
}

// ------------------------------------------------------------
// 8E. SETTINGS TAB VIEW (WITH REAL FILE EXPORTS)
// ------------------------------------------------------------

function drawSettingsTab(): string {
  const u: any = state.user || {};
  return `
    <div class="content-grid">
      <!-- Profile settings card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Corporate Admin Profile</div>
        </div>
        <div class="card-body">
          <form id="settings-profile-form">
            <div class="form-group">
              <label class="form-label" for="set-name">Administrator Name</label>
              <input type="text" class="form-input" id="set-name" required value="${sanitizeHtml(u.name || '')}">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="set-phone">Contact Phone</label>
                ${drawPhoneInput('set-phone', u.phone || '', 'e.g. 555-0199')}
              </div>
              <div class="form-group">
                <label class="form-label" for="set-location">Location</label>
                <input type="text" class="form-input" id="set-location" required value="${sanitizeHtml(u.location || '')}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="set-bio">Brief Biography</label>
              <textarea class="form-input" id="set-bio" rows="3">${sanitizeHtml(u.bio || '')}</textarea>
            </div>
            
            <button type="submit" class="btn btn-primary" id="set-submit-btn" style="width:100%; margin-top:8px;">Update Admin Profile</button>
          </form>
        </div>
      </div>
      
      <!-- Real CSV/PDF Exporter card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">System Utilities & Exports</div>
        </div>
        <div class="card-body" style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <span style="font-size:13px; font-weight:600; display:block; margin-bottom:4px;">Export Workspace Sheet</span>
            <p style="font-size:11px; color:var(--muted-foreground); margin-bottom:12px;">Trigger backend document compiler to download employee and client records.</p>
            
            <div style="display:flex; gap:10px; margin-bottom:12px;">
              <select class="form-input" id="export-type-select" style="font-size:12px; background:var(--background);">
                <option value="general">General Audit Report</option>
                <option value="employee">Employee Roster Only</option>
                <option value="client">Client Roster Only</option>
                <option value="financials">Financial Ledgers Sheet</option>
              </select>
              
              <select class="form-input" id="export-format-select" style="font-size:12px; background:var(--background); width:80px;">
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <button class="btn btn-outline btn-sm" id="real-export-btn" style="width:100%; gap:6px;">
              ${getIconSvg('download')} Trigger Remote Export
            </button>
          </div>
          
          <div style="border-top:1px solid var(--border); padding-top:16px;">
            <span style="font-size:13px; font-weight:600; display:block; margin-bottom:4px;">Security Lock Credentials</span>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px; padding:12px; background:var(--muted); border-radius:8px; border:1px solid var(--border);">
              <div>
                <span style="font-weight:700; font-size:13px; display:block;">Biometrics Lock</span>
                <span style="font-size:10px; color:var(--muted-foreground);">Prompt simulated biometric check on reload.</span>
              </div>
              <input type="checkbox" id="set-biometrics-checkbox" ${u.biometrics_enabled ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindSettingsEvents() {
  const profileForm = document.getElementById('settings-profile-form') as HTMLFormElement;
  
  // Bind phone input events
  const setPhoneInput = document.getElementById('set-phone') as HTMLInputElement;
  const initialCountry = getSelectedCountry('set-phone');
  let setPhoneVal = initialCountry.dial + (setPhoneInput?.value || '');
  bindPhoneInputEvents('set-phone', (fullVal) => {
    setPhoneVal = fullVal;
  });

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('set-submit-btn') as HTMLButtonElement;

      const name = (document.getElementById('set-name') as HTMLInputElement).value;
      const location = (document.getElementById('set-location') as HTMLInputElement).value;
      const bio = (document.getElementById('set-bio') as HTMLTextAreaElement).value;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Updating...';

      const selectedCountry = _phoneCountryState.get('set-phone') || 'US';
      const phoneCheck = validateAndFormatPhone(setPhoneVal, selectedCountry);
      if (!phoneCheck.isValid) {
        showToast('Please enter a valid phone number', 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Update Admin Profile';
        return;
      }

      try {
        const patchRes = await apiRequest('me/', {
          method: 'PATCH',
          body: JSON.stringify({
            first_name: name.split(' ')[0] || name,
            phone: phoneCheck.formatted,
            location,
            bio
          })
        });

        state.user = patchRes;
        showToast('Admin Profile card updated successfully!', 'success');
        renderApp();
      } catch (err: any) {
        showToast(err.message || 'Profile update failed', 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Update Admin Profile';
      }
    });
  }

  // Biometrics toggle update
  const bioCheckbox = document.getElementById('set-biometrics-checkbox') as HTMLInputElement;
  if (bioCheckbox) {
    bioCheckbox.addEventListener('change', async () => {
      const active = bioCheckbox.checked;
      try {
        const patchRes = await apiRequest('me/', {
          method: 'PATCH',
          body: JSON.stringify({ biometrics_enabled: active })
        });
        state.user = patchRes;
        showToast(active ? 'Biometric security activated!' : 'Biometric security disabled', 'info');
      } catch (err: any) {
        showToast(err.message || 'Toggle failed', 'error');
        bioCheckbox.checked = !active;
      }
    });
  }

  // Caching mechanism for web organization profile completeness (valid for 5 minutes)
  let _profileCheckCache: { timestamp: number; isValid: boolean } | null = null;

  async function checkWebProfileCompleteness(): Promise<boolean> {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    if (_profileCheckCache && (now - _profileCheckCache.timestamp) < CACHE_DURATION) {
      return _profileCheckCache.isValid;
    }

    try {
      const res = await apiRequest('me/');
      state.user = res;
      const isValid = !!(res.business_name && res.company_logo);
      _profileCheckCache = { timestamp: now, isValid };
      return isValid;
    } catch (err) {
      console.warn('Failed to refresh profile in web pre-check:', err);
      const isValid = !!(state.user?.business_name && state.user?.company_logo);
      return isValid;
    }
  }

  function showBrandingWarningModal(onConfigure: () => void, onExportStandard: () => void) {
    const backdrop = document.createElement('div');
    backdrop.style.position = 'fixed';
    backdrop.style.top = '0';
    backdrop.style.left = '0';
    backdrop.style.width = '100vw';
    backdrop.style.height = '100vh';
    backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    backdrop.style.display = 'flex';
    backdrop.style.alignItems = 'center';
    backdrop.style.justifyContent = 'center';
    backdrop.style.zIndex = '9999';
    backdrop.style.backdropFilter = 'blur(4px)';

    const container = document.createElement('div');
    container.className = 'card';
    container.style.width = '400px';
    container.style.maxWidth = '90%';
    container.style.padding = '24px';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    container.style.backgroundColor = 'var(--card)';
    container.style.border = '1px solid var(--border)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '16px';

    const iconWrap = document.createElement('div');
    iconWrap.style.width = '64px';
    iconWrap.style.height = '64px';
    iconWrap.style.borderRadius = '50%';
    iconWrap.style.backgroundColor = 'rgba(79, 70, 229, 0.1)';
    iconWrap.style.display = 'flex';
    iconWrap.style.alignItems = 'center';
    iconWrap.style.justifyContent = 'center';
    
    const iconSvg = document.createElement('div');
    iconSvg.innerHTML = DOMPurify.sanitize(getIconSvg('alert'));
    iconSvg.style.width = '28px';
    iconSvg.style.height = '28px';
    iconSvg.style.color = 'var(--primary)';
    iconWrap.appendChild(iconSvg);

    const title = document.createElement('h3');
    title.textContent = 'Branding Incomplete';
    title.style.fontSize = '18px';
    title.style.fontWeight = '700';
    title.style.color = 'var(--foreground)';
    title.style.margin = '0';

    const desc = document.createElement('p');
    desc.textContent = 'Your organization profile is missing a name or logo. To export branded PDF reports, please complete your profile setup.';
    desc.style.fontSize = '13px';
    desc.style.color = 'var(--muted-foreground)';
    desc.style.textAlign = 'center';
    desc.style.lineHeight = '1.5';
    desc.style.margin = '0';

    const btnCol = document.createElement('div');
    btnCol.style.display = 'flex';
    btnCol.style.flexDirection = 'column';
    btnCol.style.gap = '10px';
    btnCol.style.width = '100%';
    btnCol.style.marginTop = '8px';

    const btnConfigure = document.createElement('button');
    btnConfigure.className = 'btn btn-primary';
    btnConfigure.style.width = '100%';
    btnConfigure.style.justifyContent = 'center';
    btnConfigure.textContent = 'Configure Branding';
    btnConfigure.addEventListener('click', () => {
      backdrop.remove();
      onConfigure();
    });

    const btnExportStandard = document.createElement('button');
    btnExportStandard.className = 'btn btn-outline';
    btnExportStandard.style.width = '100%';
    btnExportStandard.style.justifyContent = 'center';
    btnExportStandard.textContent = 'Export Standard (No Branding)';
    btnExportStandard.addEventListener('click', () => {
      backdrop.remove();
      onExportStandard();
    });

    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn btn-ghost';
    btnCancel.style.width = '100%';
    btnCancel.style.justifyContent = 'center';
    btnCancel.textContent = 'Cancel';
    btnCancel.addEventListener('click', () => {
      backdrop.remove();
    });

    btnCol.appendChild(btnConfigure);
    btnCol.appendChild(btnExportStandard);
    btnCol.appendChild(btnCancel);

    container.appendChild(iconWrap);
    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(btnCol);

    backdrop.appendChild(container);
    document.body.appendChild(backdrop);
  }

  // Real REST Trigger Export
  const exportBtn = document.getElementById('real-export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const format = (document.getElementById('export-format-select') as HTMLSelectElement).value;
      const type = (document.getElementById('export-type-select') as HTMLSelectElement).value;
      
      exportBtn.setAttribute('disabled', 'true');
      exportBtn.innerHTML = DOMPurify.sanitize('Checking profile...');

      try {
        const isProfileComplete = await checkWebProfileCompleteness();
        
        const executeExport = async (skipBranding: boolean) => {
          exportBtn.setAttribute('disabled', 'true');
          exportBtn.innerHTML = DOMPurify.sanitize('Compiling File...');
          try {
            const token = localStorage.getItem('admin-suite.token');
            const url = `${API_BASE}export/?format=${format}&type=${type}&time_filter=all&id=&skip_branding=${skipBranding}`;
            
            const response = await fetch(url, {
              headers: {
                'Authorization': `Token ${token}`
              }
            });

            if (!response.ok) {
              throw new Error(`Export compile failed: ${response.status}`);
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `adminsuite_${type}_report.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            showToast('Report downloaded successfully!', 'success');
          } catch (err: any) {
            showToast(err.message || 'Trigger export failed', 'error');
          } finally {
            exportBtn.removeAttribute('disabled');
            exportBtn.innerHTML = DOMPurify.sanitize(`${getIconSvg('download')} Trigger Remote Export`);
          }
        };

        if (isProfileComplete) {
          await executeExport(false);
        } else {
          exportBtn.removeAttribute('disabled');
          exportBtn.innerHTML = DOMPurify.sanitize(`${getIconSvg('download')} Trigger Remote Export`);
          showBrandingWarningModal(
            () => {
              navigateToTab('settings');
            },
            async () => {
              await executeExport(true);
            }
          );
        }
      } catch (err: any) {
        showToast(err.message || 'Verification check failed', 'error');
        exportBtn.removeAttribute('disabled');
        exportBtn.innerHTML = DOMPurify.sanitize(`${getIconSvg('download')} Trigger Remote Export`);
      }
    });
  }
}

// ============================================================
// DASHBOARD INTERACTIVE TOUR SYSTEM
// ============================================================

let dashboardTourStep = -1; // -1 = inactive

function shouldShowDashboardTour(): boolean {
  return !localStorage.getItem('admin-suite.dashboard-tour-complete');
}

function startDashboardTour() {
  dashboardTourStep = 0;
  renderDashboardTourStep();
}

function endDashboardTour() {
  dashboardTourStep = -1;
  localStorage.setItem('admin-suite.dashboard-tour-complete', 'true');
  cleanupDashboardTour();
}

function advanceDashboardTour() {
  dashboardTourStep++;
  if (dashboardTourStep >= DASHBOARD_TOUR_STEPS.length) {
    endDashboardTour();
    showToast('Tour complete! You are all set to use Admin Suite.', 'success');
    return;
  }
  renderDashboardTourStep();
}

function cleanupDashboardTour() {
  const overlay = document.getElementById('dashboard-tour-overlay');
  if (overlay) overlay.remove();
}

function renderDashboardTourStep() {
  cleanupDashboardTour();

  if (dashboardTourStep < 0 || dashboardTourStep >= DASHBOARD_TOUR_STEPS.length) return;

  const step = DASHBOARD_TOUR_STEPS[dashboardTourStep];
  const targetEl = document.querySelector(step.target) as HTMLElement;

  if (!targetEl) {
    // Target not found (e.g., sidebar hidden on mobile), skip to next
    advanceDashboardTour();
    return;
  }

  const targetRect = targetEl.getBoundingClientRect();

  // Skip if element is not visible (zero dimensions)
  if (targetRect.width === 0 && targetRect.height === 0) {
    advanceDashboardTour();
    return;
  }

  // Scroll target into view if needed
  targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Allow scroll to settle before positioning overlay
  requestAnimationFrame(() => {
    const rect = targetEl.getBoundingClientRect();
    const pad = 8;

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'dashboard-tour-overlay';
    overlay.className = 'dashboard-tour-overlay';

    // Create spotlight cutout around target element
    const spotlight = document.createElement('div');
    spotlight.className = 'dashboard-tour-spotlight';
    spotlight.style.top = `${rect.top - pad}px`;
    spotlight.style.left = `${rect.left - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;

    // Build progress dots markup
    let dotsMarkup = '';
    for (let i = 0; i < DASHBOARD_TOUR_STEPS.length; i++) {
      const dotCls = i === dashboardTourStep ? 'active' : i < dashboardTourStep ? 'completed' : '';
      dotsMarkup += `<span class="tour-dot ${dotCls}"></span>`;
    }

    const isLastStep = dashboardTourStep === DASHBOARD_TOUR_STEPS.length - 1;
    const stepNum = dashboardTourStep + 1;
    const totalSteps = DASHBOARD_TOUR_STEPS.length;

    // Build tooltip element
    // NOTE(security): All content is developer-defined static strings, no user input.
    const tooltip = document.createElement('div');
    tooltip.className = 'dashboard-tour-tooltip';
    tooltip.innerHTML = DOMPurify.sanitize(`
      <div class="tour-step-badge">
        <span>Step ${stepNum} of ${totalSteps}</span>
      </div>
      <div class="tour-step-title">${step.title}</div>
      <div class="tour-step-body">${step.body}</div>
      <div class="tour-progress-dots">${dotsMarkup}</div>
      <div class="tour-btn-row">
        <button class="tour-btn-gotit" id="tour-btn-gotit">Got it</button>
        ${isLastStep
          ? '<button class="tour-btn-continue" id="tour-btn-finish">Finish Tour \u2713</button>'
          : '<button class="tour-btn-continue" id="tour-btn-continue">Continue \u2192</button>'
        }
      </div>
    `);

    // Position tooltip relative to target
    positionTourTooltip(tooltip, rect, step.position);

    overlay.appendChild(spotlight);
    overlay.appendChild(tooltip);
    document.body.appendChild(overlay);

    // Bind navigation events
    const gotItBtn = document.getElementById('tour-btn-gotit');
    const nextBtn = document.getElementById('tour-btn-continue') || document.getElementById('tour-btn-finish');

    if (gotItBtn) {
      gotItBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        endDashboardTour();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isLastStep) {
          endDashboardTour();
          showToast('Tour complete! You are all set to use Admin Suite.', 'success');
        } else {
          advanceDashboardTour();
        }
      });
    }

    // Click overlay backdrop to dismiss tour
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) endDashboardTour();
    });
  });
}

function positionTourTooltip(tooltip: HTMLElement, targetRect: DOMRect, position: string) {
  const gap = 16;
  const tooltipWidth = 320;

  switch (position) {
    case 'right':
      tooltip.style.top = `${targetRect.top}px`;
      tooltip.style.left = `${targetRect.right + gap}px`;
      break;
    case 'bottom':
      tooltip.style.top = `${targetRect.bottom + gap}px`;
      tooltip.style.left = `${Math.max(12, targetRect.left + targetRect.width / 2 - tooltipWidth / 2)}px`;
      break;
    case 'top':
      tooltip.style.left = `${Math.max(12, targetRect.left + targetRect.width / 2 - tooltipWidth / 2)}px`;
      tooltip.style.top = `${Math.max(12, targetRect.top - gap - 280)}px`;
      break;
    case 'left':
      tooltip.style.top = `${targetRect.top}px`;
      tooltip.style.left = `${targetRect.left - tooltipWidth - gap}px`;
      break;
  }

  // Ensure tooltip stays within viewport bounds
  requestAnimationFrame(() => {
    const tr = tooltip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (position === 'top') {
      // Recalculate with actual measured height
      const actualHeight = tr.height;
      tooltip.style.top = `${Math.max(12, targetRect.top - gap - actualHeight)}px`;
    }

    const updatedRect = tooltip.getBoundingClientRect();
    if (updatedRect.right > vw - 12) {
      tooltip.style.left = `${vw - tooltipWidth - 20}px`;
    }
    if (updatedRect.bottom > vh - 12) {
      tooltip.style.top = `${vh - updatedRect.height - 20}px`;
    }
    if (updatedRect.left < 12) {
      tooltip.style.left = '20px';
    }
    if (updatedRect.top < 12) {
      tooltip.style.top = '20px';
    }
  });
}

// ------------------------------------------------------------
// SUSPENDED & LOCKOUT VIEWS
// ------------------------------------------------------------

function drawSuspended(): string {
  const until = state.suspendedUntil ? new Date(state.suspendedUntil).getTime() : 0;
  const now = new Date().getTime();
  const secondsLeft = Math.max(0, Math.floor((until - now) / 1000));
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const padZero = (n: number) => n.toString().padStart(2, '0');

  return `
    <div class="login-page">
      <div class="split-container">
        ${drawAuthLeftPanel()}
        <div class="split-right-panel" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
          <div style="background: rgba(239, 68, 68, 0.08); border: 1.5px solid rgba(239, 68, 68, 0.2); padding: 28px; border-radius: 20px; text-align: center; width: 100%; max-width: 420px; box-shadow: var(--shadow-xl);">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #ef4444;">
              ${getIconSvg('alert')}
            </div>
            <h1 style="font-size: 24px; font-weight: 800; color: var(--foreground); margin-bottom: 10px;">Account Locked</h1>
            <p style="color: var(--muted-foreground); font-size: 14px; line-height: 22px; margin-bottom: 24px;">
              Your account has been temporarily suspended due to 7 consecutive failed login attempts. To safeguard your workspace data, security lock has been activated.
            </p>
            
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
              <span style="font-size: 10px; font-weight: 700; color: var(--muted-foreground); letter-spacing: 1.5px; display: block; margin-bottom: 6px; text-transform: uppercase;">Access Restores In</span>
              <span id="suspended-countdown-val" style="font-size: 32px; font-weight: 700; font-family: monospace; color: var(--foreground);">${padZero(mins)}:${padZero(secs)}</span>
            </div>

            <button class="login-btn" id="suspended-retry-btn" ${secondsLeft > 0 ? 'disabled style="background: var(--muted); color: var(--muted-foreground); cursor: not-allowed;"' : ''}>Try Logging In</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

let suspendedTimerInterval: any = null;

function bindSuspendedEvents() {
  const retryBtn = document.getElementById('suspended-retry-btn') as HTMLButtonElement;
  const countdownVal = document.getElementById('suspended-countdown-val');
  
  if (suspendedTimerInterval) {
    clearInterval(suspendedTimerInterval);
  }

  const updateTimer = () => {
    const until = state.suspendedUntil ? new Date(state.suspendedUntil).getTime() : 0;
    const now = new Date().getTime();
    const secondsLeft = Math.max(0, Math.floor((until - now) / 1000));
    
    if (secondsLeft <= 0) {
      clearInterval(suspendedTimerInterval);
      state.suspendedUntil = null;
      localStorage.removeItem('admin-suite.suspended-until');
      if (retryBtn) {
        retryBtn.disabled = false;
        retryBtn.style.background = '';
        retryBtn.style.color = '';
        retryBtn.style.cursor = '';
      }
      if (countdownVal) {
        countdownVal.innerText = '00:00';
      }
      showToast('Suspension lifted. You can try logging in again.', 'success');
      state.view = 'login';
      renderApp();
      return;
    }

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const padZero = (n: number) => n.toString().padStart(2, '0');
    if (countdownVal) {
      countdownVal.innerText = `${padZero(mins)}:${padZero(secs)}`;
    }
  };

  suspendedTimerInterval = setInterval(updateTimer, 1000);

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      state.suspendedUntil = null;
      localStorage.removeItem('admin-suite.suspended-until');
      state.view = 'login';
      renderApp();
    });
  }
}

// ------------------------------------------------------------
// FORGOT PASSWORD FLOW
// ------------------------------------------------------------

function drawForgotPassword(): string {
  let content = '';

  if (!state.forgotStep) {
    state.forgotStep = 'email';
  }

  if (state.forgotStep === 'email') {
    content = `
      <div class="login-logo" style="text-align: left; margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Password Recovery</h1>
        <p style="color: var(--muted-foreground); font-size: 14px; margin-top: 4px;">Enter the email you registered with to receive a 6-digit verification code.</p>
      </div>
      
      <form id="forgot-email-form">
        <div class="form-group" style="position: relative; margin-bottom: 24px;">
          <label class="form-label" for="forgot-email">Email Address</label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
              ${getIconSvg('mail', 'form-icon')}
            </span>
            <input class="form-input" type="email" id="forgot-email" required placeholder="Email address" style="padding-left: 38px;" value="${state.forgotEmail || ''}">
          </div>
        </div>
        
        <button type="submit" class="login-btn" id="forgot-email-btn">Send Code</button>
      </form>
      
      <div style="text-align: center; margin-top: 24px;">
        <a href="#" id="forgot-back-to-login" style="font-size: 13px; font-weight: 600; color: var(--accent); text-decoration: underline;">Back to Sign In</a>
      </div>
    `;
  } else if (state.forgotStep === 'otp') {
    content = `
      <div class="login-logo" style="text-align: left; margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Enter OTP</h1>
        <p style="color: var(--muted-foreground); font-size: 14px; margin-top: 4px;">A 6-digit verification code was sent to <strong style="color:var(--foreground);">${state.forgotEmail}</strong>.</p>
      </div>
      
      <form id="forgot-otp-form">
        <div class="form-group" style="position: relative; margin-bottom: 24px;">
          <label class="form-label" for="forgot-code">6-Digit Code</label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
              ${getIconSvg('lock', 'form-icon')}
            </span>
            <input class="form-input" type="text" id="forgot-code" required placeholder="6-digit code" maxlength="6" style="padding-left: 38px; letter-spacing: 4px; font-weight: 600;" value="${state.forgotCode || ''}">
          </div>
        </div>
        
        <button type="submit" class="login-btn" id="forgot-otp-btn">Verify Code</button>
      </form>
      
      <div style="text-align: center; margin-top: 24px; display: flex; justify-content: space-between; padding: 0 10px;">
        <a href="#" id="forgot-change-email" style="font-size: 13px; font-weight: 600; color: var(--muted-foreground); text-decoration: underline;">Change email</a>
        <a href="#" id="forgot-resend-otp" style="font-size: 13px; font-weight: 600; color: var(--accent); text-decoration: underline;">Resend code</a>
      </div>
    `;
  } else if (state.forgotStep === 'new-password') {
    content = `
      <div class="login-logo" style="text-align: left; margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">New Password</h1>
        <p style="color: var(--muted-foreground); font-size: 14px; margin-top: 4px;">Set a new secure password for your account.</p>
      </div>
      
      <form id="forgot-reset-form">
        <div class="form-group" style="position: relative; margin-bottom: 16px;">
          <label class="form-label" for="forgot-password">New Password</label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
              ${getIconSvg('lock', 'form-icon')}
            </span>
            <input class="form-input" type="password" id="forgot-password" required placeholder="New password (min 8 chars)" style="padding-left: 38px;">
          </div>
        </div>

        <div class="form-group" style="position: relative; margin-bottom: 24px;">
          <label class="form-label" for="forgot-confirm">Confirm Password</label>
          <div style="position: relative; display: flex; align-items: center;">
            <span style="position: absolute; left: 12px; display: flex; color: var(--muted-foreground);">
              ${getIconSvg('check', 'form-icon')}
            </span>
            <input class="form-input" type="password" id="forgot-confirm" required placeholder="Confirm new password" style="padding-left: 38px;">
          </div>
        </div>
        
        <button type="submit" class="login-btn" id="forgot-reset-btn">Reset Password</button>
      </form>
    `;
  }

  return `
    <div class="login-page">
      <div class="split-container">
        ${drawAuthLeftPanel()}
        <div class="split-right-panel">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function bindForgotPasswordEvents() {
  const backToLogin = document.getElementById('forgot-back-to-login');
  const changeEmail = document.getElementById('forgot-change-email');
  const resendOtp = document.getElementById('forgot-resend-otp');

  const emailForm = document.getElementById('forgot-email-form') as HTMLFormElement;
  const otpForm = document.getElementById('forgot-otp-form') as HTMLFormElement;
  const resetForm = document.getElementById('forgot-reset-form') as HTMLFormElement;

  if (backToLogin) {
    backToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      state.view = 'login';
      renderApp();
    });
  }

  if (changeEmail) {
    changeEmail.addEventListener('click', (e) => {
      e.preventDefault();
      state.forgotStep = 'email';
      renderApp();
    });
  }

  if (resendOtp) {
    resendOtp.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const response = await fetch(`${API_BASE}auth/password-reset/send-code/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.forgotEmail.trim().toLowerCase() })
        });
        const data = await response.json();
        if (response.ok) {
          showToast('Verification code resent successfully.', 'success');
          if (data.code) {
            console.log("DEV RESET CODE:", data.code);
            showToast(`[DEV MODE] OTP is: ${data.code}`, 'info');
          }
        } else {
          showToast(data.error || 'Failed to send code.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Error occurred.', 'error');
      }
    });
  }

  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('forgot-email') as HTMLInputElement;
      const email = emailInput.value.trim().toLowerCase();
      const submitBtn = document.getElementById('forgot-email-btn') as HTMLButtonElement;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="dot-loader" style="margin:0; gap:4px;"><span></span><span></span><span></span></span>';

      try {
        const response = await fetch(`${API_BASE}auth/password-reset/send-code/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await response.json();
        submitBtn.disabled = false;
        submitBtn.innerText = 'Send Code';

        if (response.ok) {
          state.forgotEmail = email;
          state.forgotStep = 'otp';
          showToast(data.message || 'OTP code sent successfully.', 'success');
          if (data.code) {
            console.log("DEV RESET CODE:", data.code);
            showToast(`[DEV MODE] OTP is: ${data.code}`, 'info');
          }
          renderApp();
        } else {
          showToast(data.error || 'No account found with this email.', 'error');
        }
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Send Code';
        showToast(err.message || 'Network error.', 'error');
      }
    });
  }

  if (otpForm) {
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('forgot-code') as HTMLInputElement;
      const code = codeInput.value.trim();
      const submitBtn = document.getElementById('forgot-otp-btn') as HTMLButtonElement;

      if (code.length !== 6) {
        showToast('OTP must be exactly 6 digits.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="dot-loader" style="margin:0; gap:4px;"><span></span><span></span><span></span></span>';

      try {
        const response = await fetch(`${API_BASE}auth/password-reset/verify/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.forgotEmail, code })
        });

        const data = await response.json();
        submitBtn.disabled = false;
        submitBtn.innerText = 'Verify Code';

        if (response.ok) {
          state.forgotCode = code;
          state.forgotStep = 'new-password';
          showToast(data.message || 'Code verified successfully.', 'success');
          renderApp();
        } else {
          showToast(data.error || 'Invalid or expired OTP code.', 'error');
        }
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Verify Code';
        showToast(err.message || 'Network error.', 'error');
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pwdInput = document.getElementById('forgot-password') as HTMLInputElement;
      const confirmInput = document.getElementById('forgot-confirm') as HTMLInputElement;
      const new_password = pwdInput.value;
      const confirm = confirmInput.value;
      const submitBtn = document.getElementById('forgot-reset-btn') as HTMLButtonElement;

      if (new_password.length < 8) {
        showToast('Password must be at least 8 characters long.', 'error');
        return;
      }
      if (new_password !== confirm) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="dot-loader" style="margin:0; gap:4px;"><span></span><span></span><span></span></span>';

      try {
        const response = await fetch(`${API_BASE}auth/password-reset/confirm/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: state.forgotEmail, code: state.forgotCode, new_password })
        });

        const data = await response.json();
        submitBtn.disabled = false;
        submitBtn.innerText = 'Reset Password';

        if (response.ok) {
          showToast(data.message || 'Password reset successfully! You can now sign in.', 'success');
          state.view = 'login';
          state.forgotStep = 'email';
          state.forgotEmail = '';
          state.forgotCode = '';
          renderApp();
        } else {
          showToast(data.error || 'Failed to reset password.', 'error');
        }
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Reset Password';
        showToast(err.message || 'Network error.', 'error');
      }
    });
  }
}

// ------------------------------------------------------------
// 8D. REAL-TIME TEAM CHAT VIEW
// ------------------------------------------------------------

let chatSearchQuery = '';

async function pollChatData() {
  if (state.activeTab !== 'chat') return;
  try {
    const contactsData = await apiRequest('chat/contacts/');
    state.chatContacts = contactsData;
    
    if (state.chatActiveContact) {
      const updated = state.chatContacts.find(
        (c: any) => c.id === state.chatActiveContact.id && c.type === state.chatActiveContact.type
      );
      if (updated) {
        state.chatActiveContact = updated;
      }
    } else if (state.chatContacts.length > 0) {
      state.chatActiveContact = state.chatContacts[0];
    }

    if (state.chatActiveContact) {
      let url = 'chat/messages/';
      if (state.chatActiveContact.type === 'private') {
        url += `?recipient_id=${state.chatActiveContact.id}`;
      } else if (state.chatActiveContact.id !== 'group') {
        url += `?group_id=${state.chatActiveContact.id}`;
      }
      const messagesData = await apiRequest(url);
      state.chatMessages = messagesData;
    }
    
    updateChatDOM();
  } catch (err) {
    console.error('Failed to poll chat data', err);
  }
}

function updateChatDOM() {
  const contactsContainer = document.getElementById('chat-contacts-list-container');
  if (contactsContainer) {
    let contactsHtml = '';
    
    const sortedContacts = [...state.chatContacts].sort((a, b) => {
      const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
      const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
      return timeB - timeA;
    });

    const filteredContacts = sortedContacts.filter(c => 
      c.name.toLowerCase().includes(chatSearchQuery.toLowerCase())
    );

    if (filteredContacts.length === 0) {
      contactsHtml = `<div style="text-align:center; padding:20px; color:var(--muted-foreground);">No conversations found.</div>`;
    } else {
      contactsHtml = filteredContacts.map(c => {
        const isActive = state.chatActiveContact && state.chatActiveContact.id === c.id && state.chatActiveContact.type === c.type;
        const avatarHtml = c.avatar 
          ? `<img src="${c.avatar}" alt="${sanitizeHtml(c.name)}">` 
          : sanitizeHtml(c.initials || c.name.slice(0, 2).toUpperCase());
        const lastMsg = c.last_message ? sanitizeHtml(c.last_message) : '<span style="font-style:italic; opacity:0.6;">No messages yet</span>';
        const unreadBadge = c.unread_count > 0 ? `<span class="chat-contact-unread">${c.unread_count}</span>` : '';
        
        return `
          <div class="chat-contact-item ${isActive ? 'active' : ''}" data-chat-id="${c.id}" data-chat-type="${c.type}">
            <div class="chat-contact-avatar">${avatarHtml}</div>
            <div class="chat-contact-info">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="chat-contact-name">${sanitizeHtml(c.name)}</div>
                ${unreadBadge}
              </div>
              <div class="chat-contact-msg">${lastMsg}</div>
            </div>
          </div>
        `;
      }).join('');
    }
    contactsContainer.innerHTML = DOMPurify.sanitize(contactsHtml);
    
    contactsContainer.querySelectorAll('.chat-contact-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const chatId = target.dataset.chatId;
        const chatType = target.dataset.chatType;
        if (chatId && chatType) {
          const id = chatId === 'group' ? 'group' : parseInt(chatId);
          const contact = state.chatContacts.find((c: any) => c.id === id && c.type === chatType);
          if (contact) {
            state.chatActiveContact = contact;
            pollChatData();
            updateChatDOM();
          }
        }
      });
    });
  }

  const viewportContainer = document.getElementById('chat-viewport-container');
  if (viewportContainer) {
    if (!state.chatActiveContact) {
      viewportContainer.innerHTML = DOMPurify.sanitize(`
        <div class="chat-empty-state">
          <div class="chat-empty-icon">💬</div>
          <h3>Welcome to Team Chat</h3>
          <p style="color:var(--muted-foreground); font-size:14px;">Select a conversation to start messaging your colleagues.</p>
        </div>
      `);
      return;
    }

    const c = state.chatActiveContact;
    const headerHtml = `
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-contact-avatar" style="width:36px; height:36px; font-size:12px;">
            ${c.avatar ? `<img src="${c.avatar}" alt="${sanitizeHtml(c.name)}">` : sanitizeHtml(c.initials || c.name.slice(0,2).toUpperCase())}
          </div>
          <div>
            <div class="chat-header-name">${sanitizeHtml(c.name)}</div>
            <div class="chat-header-status">${c.type === 'group' ? 'Group Workspace' : 'Direct Message'}</div>
          </div>
        </div>
      </div>
    `;

    const msgsHtml = state.chatMessages.map(m => {
      const isOutgoing = m.sender && m.sender.id === state.user?.id;
      const initials = m.sender ? (m.sender.name ? m.sender.name.slice(0, 2).toUpperCase() : m.sender.username.slice(0, 2).toUpperCase()) : '??';
      const senderName = m.sender ? sanitizeHtml(m.sender.name || m.sender.username) : 'System';
      const formattedTime = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="chat-message ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${isOutgoing ? '' : `<div class="chat-message-avatar">${initials}</div>`}
          <div class="chat-message-body">
            ${isOutgoing ? '' : `<div class="chat-message-sender">${senderName}</div>`}
            <div class="chat-message-text">${sanitizeHtml(m.text)}</div>
            <div class="chat-message-time">${formattedTime}</div>
          </div>
        </div>
      `;
    }).join('');

    const footerHtml = `
      <div class="chat-footer">
        <input type="text" class="chat-input" id="chat-message-input-field" placeholder="Type a message..." autocomplete="off">
        <button class="chat-send-button" id="chat-send-message-btn">${getIconSvg('send')}</button>
      </div>
    `;

    viewportContainer.innerHTML = DOMPurify.sanitize(`
      ${headerHtml}
      <div class="chat-messages" id="chat-messages-scroll-container">
        ${msgsHtml || '<div style="text-align:center; padding:40px; color:var(--muted-foreground); font-size:13px;">No messages in this chat yet. Say hello!</div>'}
      </div>
      ${footerHtml}
    `);

    const scrollContainer = document.getElementById('chat-messages-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }

    const inputField = document.getElementById('chat-message-input-field') as HTMLInputElement;
    const sendBtn = document.getElementById('chat-send-message-btn');

    const sendMessage = async () => {
      if (!inputField) return;
      const text = inputField.value.trim();
      if (!text) return;
      
      inputField.value = '';
      
      try {
        const body: any = { text };
        if (state.chatActiveContact.type === 'private') {
          body.recipient_id = state.chatActiveContact.id;
        } else if (state.chatActiveContact.id !== 'group') {
          body.group_id = state.chatActiveContact.id;
        }

        await apiRequest('chat/send/', {
          method: 'POST',
          body: JSON.stringify(body)
        });

        await pollChatData();
      } catch (err: any) {
        showToast(err.message || 'Failed to send message', 'error');
      }
    };

    if (inputField) {
      inputField.focus();
      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }
  }
}

function openCreateGroupModal() {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  const employeesChecklist = state.employees.map(emp => {
    if (!emp.linked_user) return '';
    return `
      <div style="display:flex; align-items:center; gap:8px; padding:6px 0;">
        <input type="checkbox" class="group-member-checkbox" value="${emp.linked_user}" id="chk-emp-${emp.id}">
        <label for="chk-emp-${emp.id}" style="font-size:14px; cursor:pointer;">${sanitizeHtml(emp.name)} (${sanitizeHtml(emp.role)})</label>
      </div>
    `;
  }).join('');

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="chat-modal-overlay">
      <div class="chat-modal">
        <div class="chat-modal-header">
          <h2 class="chat-modal-title">Create Custom Group</h2>
          <button class="chat-modal-close" id="chat-modal-close-btn">${getIconSvg('x')}</button>
        </div>
        
        <form id="create-group-form">
          <div class="chat-modal-body">
            <div class="form-group">
              <label class="form-label" for="group-name-input">Group Name</label>
              <input type="text" class="form-input" id="group-name-input" required placeholder="e.g. Finance Taskforce">
            </div>
            
            <div class="form-group">
              <label class="form-label">Select Group Members</label>
              <div style="max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-md); padding:8px 12px; background:rgba(0,0,0,0.1);">
                ${employeesChecklist || '<div style="font-size:12px; color:var(--muted-foreground); text-align:center; padding:12px;">No employees available to add</div>'}
              </div>
            </div>
          </div>
          
          <div class="chat-modal-footer">
            <button type="button" class="btn btn-outline" id="chat-modal-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="group-submit-btn">Create Group</button>
          </div>
        </form>
      </div>
    </div>
  `);

  const close = () => modalContainer.innerHTML = DOMPurify.sanitize('');
  document.getElementById('chat-modal-close-btn')?.addEventListener('click', close);
  document.getElementById('chat-modal-cancel-btn')?.addEventListener('click', close);

  const form = document.getElementById('create-group-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('group-submit-btn') as HTMLButtonElement;
    const name = (document.getElementById('group-name-input') as HTMLInputElement).value.trim();
    if (!name) return;

    const selectedMembers: number[] = [];
    document.querySelectorAll('.group-member-checkbox:checked').forEach((cb: any) => {
      selectedMembers.push(parseInt(cb.value));
    });

    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating...';

    try {
      await apiRequest('chat/groups/', {
        method: 'POST',
        body: JSON.stringify({
          name,
          members: selectedMembers
        })
      });

      showToast(`Group "${name}" created successfully!`, 'success');
      close();
      await pollChatData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = 'Create Group';
    }
  });
}

function bindChatEvents() {
  chatSearchQuery = '';
  const searchInput = document.getElementById('chat-search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      chatSearchQuery = searchInput.value.trim();
      updateChatDOM();
    });
  }

  const createGroupBtn = document.getElementById('chat-create-group-btn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', openCreateGroupModal);
  }

  // Start polling
  if (state.chatPollTimer) {
    clearInterval(state.chatPollTimer);
  }
  pollChatData();
  state.chatPollTimer = setInterval(pollChatData, 3000);
}

function drawChatTab(): string {
  return `
    <style>
      .chat-wrapper {
        display: flex;
        height: calc(100vh - 120px);
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }
      .chat-sidebar {
        width: 300px;
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }
      .chat-sidebar-header {
        padding: 16px;
        border-bottom: 1px solid var(--border);
      }
      .chat-sidebar-search {
        position: relative;
        margin-top: 10px;
      }
      .chat-sidebar-search input {
        width: 100%;
        padding: 8px 12px 8px 32px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--background);
        color: var(--foreground);
      }
      .chat-sidebar-search svg {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--muted-foreground);
      }
      .chat-contacts {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .chat-contact-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .chat-contact-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .chat-contact-item.active {
        background: var(--accent);
        color: #fff;
      }
      .chat-contact-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        flex-shrink: 0;
      }
      .chat-contact-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      .chat-contact-info {
        flex: 1;
        min-width: 0;
      }
      .chat-contact-name {
        font-weight: 600;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chat-contact-msg {
        font-size: 12px;
        color: var(--muted-foreground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chat-contact-item.active .chat-contact-msg {
        color: rgba(255, 255, 255, 0.8);
      }
      .chat-contact-unread {
        background: #ef4444;
        color: #fff;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: bold;
      }
      .chat-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: rgba(0, 0, 0, 0.02);
      }
      .chat-header {
        padding: 16px 24px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--card);
      }
      .chat-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .chat-header-name {
        font-weight: 700;
        font-size: 16px;
      }
      .chat-header-status {
        font-size: 12px;
        color: var(--muted-foreground);
      }
      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chat-message {
        display: flex;
        gap: 12px;
        max-width: 70%;
      }
      .chat-message.incoming {
        align-self: flex-start;
      }
      .chat-message.outgoing {
        align-self: flex-end;
        flex-direction: row-reverse;
      }
      .chat-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
      }
      .chat-message-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .chat-message-sender {
        font-size: 11px;
        color: var(--muted-foreground);
        font-weight: 600;
      }
      .chat-message-text {
        padding: 10px 14px;
        border-radius: var(--radius-md);
        background: var(--background);
        border: 1px solid var(--border);
        font-size: 14px;
        line-height: 1.4;
        word-break: break-word;
      }
      .chat-message.outgoing .chat-message-text {
        background: var(--accent);
        color: #fff;
        border: none;
      }
      .chat-message-time {
        font-size: 10px;
        color: var(--muted-foreground);
        align-self: flex-end;
      }
      .chat-footer {
        padding: 16px 24px;
        border-top: 1px solid var(--border);
        background: var(--card);
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .chat-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--background);
        color: var(--foreground);
        font-size: 14px;
        outline: none;
      }
      .chat-send-button {
        padding: 10px 16px;
        border-radius: var(--radius-md);
        background: var(--accent);
        color: #fff;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
      }
      .chat-send-button:hover {
        background: var(--accent-hover);
      }
      .chat-empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--muted-foreground);
        gap: 16px;
      }
      .chat-empty-icon {
        font-size: 48px;
        opacity: 0.5;
      }
      
      .chat-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }
      .chat-modal {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        width: 400px;
        max-width: 90%;
        overflow: hidden;
      }
      .chat-modal-header {
        padding: 16px 24px;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-modal-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
      .chat-modal-close {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--muted-foreground);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-modal-body {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .chat-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
    </style>

    <div class="chat-wrapper">
      <div class="chat-sidebar">
        <div class="chat-sidebar-header">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:18px; font-weight:700; margin:0;">Chats</h2>
            <button class="btn btn-outline" id="chat-create-group-btn" style="padding:4px 8px; font-size:12px;">+ Group</button>
          </div>
          <div class="chat-sidebar-search">
            ${getIconSvg('search')}
            <input type="text" id="chat-search-input" placeholder="Search direct messages or groups...">
          </div>
        </div>
        <div class="chat-contacts" id="chat-contacts-list-container">
          <div style="text-align:center; padding:20px; color:var(--muted-foreground);">Loading conversations...</div>
        </div>
      </div>
      <div class="chat-content" id="chat-viewport-container">
        <div class="chat-empty-state">
          <div class="chat-empty-icon">💬</div>
          <h3>Welcome to Team Chat</h3>
          <p style="color:var(--muted-foreground); font-size:14px;">Select a conversation to start messaging your colleagues.</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// PRICING TAB & CHECKOUT MODAL
// ============================================================

function drawPricingTab(): string {
  const currentPlan: string = state.subscriptionLimits?.plan || 'BASIC';

  const plans = [
    {
      id: 'BASIC',
      name: 'Starter',
      price: 'Free',
      period: '',
      color: '#6366f1',
      gradient: 'linear-gradient(135deg,#4338ca 0%,#7c3aed 100%)',
      icon: '🚀',
      description: 'Perfect for solo founders getting started.',
      features: [
        '5 Employees',
        '3 Clients',
        '2 Projects',
        '1 Branch',
        'Basic Dashboard',
        'Team Chat',
      ],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      price: '$19',
      period: '/month',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg,#d97706 0%,#f59e0b 100%)',
      icon: '⭐',
      description: 'For growing teams that need more capacity.',
      features: [
        'Unlimited Employees',
        'Unlimited Clients',
        'Unlimited Projects',
        '5 Branches',
        'Advanced Dashboard',
        'Priority Notifications',
        'Activity Logs',
      ],
      cta: 'Upgrade to Premium',
      disabled: false,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: '$49',
      period: '/month',
      color: '#10b981',
      gradient: 'linear-gradient(135deg,#059669 0%,#34d399 100%)',
      icon: '💎',
      popular: true,
      description: 'Full power for serious organizations.',
      features: [
        'Everything in Premium',
        'Unlimited Branches',
        'Real-Time Financial Updates',
        'Edit Employee Financials',
        'Push Notifications to Staff',
        'Branch Leaderboards',
        'Financial Category Breakdown',
        'Priority Support',
      ],
      cta: 'Upgrade to Pro',
      disabled: false,
    },
    {
      id: 'PRO_YEARLY',
      name: 'Pro Annual',
      price: '$469',
      period: '/year',
      color: '#ec4899',
      gradient: 'linear-gradient(135deg,#db2777 0%,#f472b6 100%)',
      icon: '👑',
      badge: 'Best Value — Save $119',
      description: 'All Pro features at a discounted annual rate.',
      features: [
        'Everything in Pro',
        '12 months for the price of ~9.5',
        'Priority SLA & Dedicated Support',
        'Early Access to New Features',
        'Annual Usage Report',
        'Custom Onboarding Session',
      ],
      cta: 'Get Pro Annual',
      disabled: false,
    },
  ];

  const planCards = plans.map(p => {
    const isCurrent = currentPlan === p.id;
    const featureList = p.features.map(f => `
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0;">
        <span style="color:${p.color};font-weight:700;">✓</span>
        <span>${sanitizeHtml(f)}</span>
      </div>
    `).join('');

    return `
      <div class="pricing-card ${isCurrent ? 'pricing-current' : ''}" data-plan="${p.id}" style="
        position:relative;
        background:var(--card);
        border:2px solid ${isCurrent ? p.color : 'var(--border)'};
        border-radius:20px;
        padding:28px 24px;
        display:flex;
        flex-direction:column;
        gap:16px;
        transition:transform 0.25s ease,box-shadow 0.25s ease;
        cursor:default;
        ${p.popular ? 'transform:translateY(-8px);box-shadow:0 20px 60px rgba(16,185,129,0.25);' : ''}
      ">
        ${p.popular ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:${p.gradient};color:#fff;font-size:11px;font-weight:800;padding:4px 16px;border-radius:20px;letter-spacing:1px;white-space:nowrap;">MOST POPULAR</div>` : ''}
        ${(p as any).badge ? `<div style="position:absolute;top:16px;right:16px;background:${p.gradient};color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;">${sanitizeHtml((p as any).badge)}</div>` : ''}
        ${isCurrent ? `<div style="position:absolute;top:16px;left:16px;background:#22c55e22;color:#22c55e;font-size:10px;font-weight:700;padding:3px 10px;border-radius:12px;border:1px solid #22c55e;">ACTIVE</div>` : ''}

        <div style="text-align:center;padding-top:${isCurrent || p.popular || (p as any).badge ? '12px' : '0'}">
          <div style="font-size:40px;margin-bottom:8px;">${p.icon}</div>
          <div style="font-size:20px;font-weight:800;color:var(--foreground);">${p.name}</div>
          <div style="font-size:13px;color:var(--muted-foreground);margin-top:4px;">${sanitizeHtml(p.description)}</div>
        </div>

        <div style="text-align:center;padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);">
          <span style="font-size:42px;font-weight:900;background:${p.gradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${p.price}</span>
          <span style="font-size:14px;color:var(--muted-foreground);">${p.period}</span>
        </div>

        <div style="flex:1;display:flex;flex-direction:column;gap:2px;">
          ${featureList}
        </div>

        ${isCurrent
          ? `<button class="btn" style="width:100%;background:var(--muted);color:var(--muted-foreground);cursor:not-allowed;border-radius:12px;font-weight:700;" disabled>${p.cta === 'Current Plan' ? '✓ Current Plan' : p.cta}</button>`
          : `<button class="btn btn-primary pricing-upgrade-btn" data-plan="${p.id}" data-price="${p.price}${p.period}" data-name="${p.name}" style="width:100%;background:${p.gradient};border:none;border-radius:12px;font-weight:700;font-size:14px;padding:14px;transition:opacity 0.2s;">${p.cta}</button>`
        }
      </div>
    `;
  }).join('');

  return `
    <div style="padding:32px 24px;max-width:1200px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:48px;">
        <div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:16px;">💎 ADMINSUITE PLANS</div>
        <h1 style="font-size:36px;font-weight:900;color:var(--foreground);margin:0 0 12px;">Choose Your Plan</h1>
        <p style="font-size:16px;color:var(--muted-foreground);max-width:520px;margin:0 auto;">Scale your workspace with the right tools. Upgrade anytime — no lock-in contracts.</p>
        <div style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:var(--muted);padding:8px 16px;border-radius:12px;font-size:13px;">
          Current plan: <strong style="color:var(--accent);">${sanitizeHtml(currentPlan.replace('_', ' '))}</strong>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;align-items:start;">
        ${planCards}
      </div>

      <div style="margin-top:48px;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:28px;">
        <h2 style="font-size:18px;font-weight:800;margin:0 0 20px;">📊 Feature Comparison</h2>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:2px solid var(--border);">
                <th style="text-align:left;padding:10px 12px;color:var(--muted-foreground);">Feature</th>
                <th style="text-align:center;padding:10px 12px;">Starter</th>
                <th style="text-align:center;padding:10px 12px;color:#f59e0b;">Premium</th>
                <th style="text-align:center;padding:10px 12px;color:#10b981;">Pro</th>
                <th style="text-align:center;padding:10px 12px;color:#ec4899;">Pro Annual</th>
              </tr>
            </thead>
            <tbody>
              ${[
                ['Employees','5','Unlimited','Unlimited','Unlimited'],
                ['Clients','3','Unlimited','Unlimited','Unlimited'],
                ['Projects','2','Unlimited','Unlimited','Unlimited'],
                ['Branches','1','5','Unlimited','Unlimited'],
                ['Real-Time Financials','—','—','✓','✓'],
                ['Edit Employee Financials','—','—','✓','✓'],
                ['Push Notifications','—','✓','✓','✓'],
                ['Branch Leaderboard','—','—','✓','✓'],
                ['Dedicated Support','—','—','—','✓'],
              ].map(row => `
                <tr style="border-bottom:1px solid var(--border);">
                  <td style="padding:10px 12px;font-weight:600;">${row[0]}</td>
                  ${row.slice(1).map((v,i) => `<td style="text-align:center;padding:10px 12px;color:${v==='✓'?['#6366f1','#f59e0b','#10b981','#ec4899'][i]:(v==='—'?'var(--muted-foreground)':'var(--foreground)')};font-weight:${v==='✓'?'700':'400'};">${v}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function bindPricingEvents() {
  document.querySelectorAll('.pricing-upgrade-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLElement;
      const planId = el.dataset.plan || '';
      const planPrice = el.dataset.price || '';
      const planName = el.dataset.name || '';
      openCheckoutModal(planId, planName, planPrice);
    });
  });
}

function openCheckoutModal(planId: string, planName: string, planPrice: string) {
  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = DOMPurify.sanitize(`
    <div class="modal-overlay" id="checkout-overlay">
      <div class="modal" style="max-width:500px;padding:0;overflow:hidden;border-radius:24px;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:28px 28px 20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:11px;font-weight:700;color:#a5b4fc;letter-spacing:1px;">UPGRADE TO</div>
              <div style="font-size:22px;font-weight:900;color:#fff;">${sanitizeHtml(planName)}</div>
              <div style="font-size:14px;color:#c7d2fe;margin-top:2px;">${sanitizeHtml(planPrice)}</div>
            </div>
            <button class="modal-close" id="checkout-close-btn" style="background:rgba(255,255,255,0.1);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div style="padding:28px;">
          <!-- Card Preview (flip animation) -->
          <div style="perspective:1000px;margin-bottom:24px;" id="card-flip-wrapper">
            <div id="credit-card-inner" style="position:relative;width:100%;height:180px;transition:transform 0.7s cubic-bezier(0.4,0,0.2,1);transform-style:preserve-3d;">

              <!-- Card Front -->
              <div style="position:absolute;width:100%;height:100%;backface-visibility:hidden;background:linear-gradient(135deg,#1e3a8a 0%,#312e81 50%,#4c1d95 100%);border-radius:16px;padding:22px;box-sizing:border-box;box-shadow:0 20px 40px rgba(0,0,0,0.4);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;">
                  <div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:2px;">ADMIN<span style="color:#818cf8;">SUITE</span></div>
                  <div style="width:40px;height:28px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:4px;"></div>
                </div>
                <div style="color:#c7d2fe;font-size:16px;letter-spacing:3px;font-family:monospace;margin-bottom:20px;" id="card-number-preview">•••• •••• •••• ••••</div>
                <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                  <div>
                    <div style="color:#818cf8;font-size:9px;letter-spacing:1px;margin-bottom:2px;">CARD HOLDER</div>
                    <div style="color:#fff;font-size:13px;font-weight:600;" id="card-name-preview">YOUR NAME</div>
                  </div>
                  <div>
                    <div style="color:#818cf8;font-size:9px;letter-spacing:1px;margin-bottom:2px;">EXPIRES</div>
                    <div style="color:#fff;font-size:13px;font-weight:600;" id="card-expiry-preview">MM/YY</div>
                  </div>
                </div>
              </div>

              <!-- Card Back -->
              <div style="position:absolute;width:100%;height:100%;backface-visibility:hidden;background:linear-gradient(135deg,#1e3a8a 0%,#4c1d95 100%);border-radius:16px;box-sizing:border-box;box-shadow:0 20px 40px rgba(0,0,0,0.4);transform:rotateY(180deg);">
                <div style="background:#374151;height:44px;margin-top:24px;"></div>
                <div style="padding:16px 22px;display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:12px;">
                  <div style="background:#f3f4f6;border-radius:4px;padding:6px 14px;letter-spacing:3px;font-family:monospace;font-size:14px;color:#111;" id="card-cvv-preview">•••</div>
                  <div style="color:#818cf8;font-size:12px;">CVV</div>
                </div>
              </div>

            </div>
          </div>

          <!-- Payment Form -->
          <form id="checkout-form">
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div class="form-group">
                <label class="form-label" for="cc-name">Cardholder Name</label>
                <input type="text" id="cc-name" class="form-input" placeholder="John Doe" autocomplete="cc-name" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="cc-number">Card Number</label>
                <input type="text" id="cc-number" class="form-input" placeholder="1234 5678 9012 3456" maxlength="19" autocomplete="cc-number" required>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                  <label class="form-label" for="cc-expiry">Expiry Date</label>
                  <input type="text" id="cc-expiry" class="form-input" placeholder="MM/YY" maxlength="5" autocomplete="cc-exp" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cc-cvv">CVV</label>
                  <input type="text" id="cc-cvv" class="form-input" placeholder="123" maxlength="4" autocomplete="cc-csc" required>
                </div>
              </div>
            </div>

            <div style="margin-top:20px;padding:12px;background:var(--muted);border-radius:12px;font-size:12px;color:var(--muted-foreground);display:flex;align-items:center;gap:8px;">
              🔒 <span>This is a simulated payment. No real charges will be made.</span>
            </div>

            <button type="submit" id="checkout-submit-btn" class="btn btn-primary" style="width:100%;margin-top:20px;padding:16px;font-size:15px;font-weight:800;border-radius:14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;letter-spacing:0.5px;">
              Pay ${sanitizeHtml(planPrice)} · Activate ${sanitizeHtml(planName)}
            </button>
          </form>
        </div>
      </div>
    </div>
  `);

  const closeModal = () => { modalContainer.innerHTML = DOMPurify.sanitize(''); };
  document.getElementById('checkout-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('checkout-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('checkout-overlay')) closeModal();
  });

  // Live card number formatting & preview
  const ccNumber = document.getElementById('cc-number') as HTMLInputElement;
  const ccName = document.getElementById('cc-name') as HTMLInputElement;
  const ccExpiry = document.getElementById('cc-expiry') as HTMLInputElement;
  const ccCvv = document.getElementById('cc-cvv') as HTMLInputElement;
  const cardInner = document.getElementById('credit-card-inner');

  ccNumber?.addEventListener('input', () => {
    let val = ccNumber.value.replace(/\D/g,'').slice(0,16);
    ccNumber.value = val.replace(/(\d{4})/g,'$1 ').trim();
    const preview = document.getElementById('card-number-preview');
    if (preview) preview.textContent = (ccNumber.value + ' •••• •••• •••• ••••').slice(0,19);
  });
  ccName?.addEventListener('input', () => {
    const preview = document.getElementById('card-name-preview');
    if (preview) preview.textContent = ccName.value.toUpperCase() || 'YOUR NAME';
  });
  ccExpiry?.addEventListener('input', () => {
    let val = ccExpiry.value.replace(/\D/g,'').slice(0,4);
    if (val.length >= 3) val = val.slice(0,2) + '/' + val.slice(2);
    ccExpiry.value = val;
    const preview = document.getElementById('card-expiry-preview');
    if (preview) preview.textContent = ccExpiry.value || 'MM/YY';
  });
  ccCvv?.addEventListener('focus', () => {
    if (cardInner) cardInner.style.transform = 'rotateY(180deg)';
    const preview = document.getElementById('card-cvv-preview');
    if (preview) preview.textContent = ccCvv.value || '•••';
  });
  ccCvv?.addEventListener('blur', () => {
    if (cardInner) cardInner.style.transform = 'rotateY(0deg)';
  });
  ccCvv?.addEventListener('input', () => {
    const preview = document.getElementById('card-cvv-preview');
    if (preview) preview.textContent = ccCvv.value || '•••';
  });

  // Submit handler
  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('checkout-submit-btn') as HTMLButtonElement;
    if (!submitBtn) return;

    // Basic card validation
    const rawNumber = (ccNumber?.value || '').replace(/\s/g,'');
    const expiry = ccExpiry?.value || '';
    const cvv = ccCvv?.value || '';
    const name = ccName?.value.trim() || '';

    if (rawNumber.length < 16) { showToast('Please enter a valid 16-digit card number', 'error'); return; }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) { showToast('Please enter expiry as MM/YY', 'error'); return; }
    if (cvv.length < 3) { showToast('Please enter a valid CVV', 'error'); return; }
    if (!name) { showToast('Please enter the cardholder name', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Processing Payment...';

    try {
      // Simulate payment processing delay
      await new Promise(r => setTimeout(r, 1800));

      await apiRequest('subscription/upgrade/', {
        method: 'POST',
        body: JSON.stringify({ plan: planId })
      });

      await syncAppData();
      closeModal();
      showToast(`🎉 Welcome to ${planName}! Your plan is now active.`, 'success');
      renderApp();
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.textContent = `Pay ${planPrice} · Activate ${planName}`;
      showToast(err.message || 'Payment failed. Please try again.', 'error');
    }
  });
}

// ============================================================
// APP BOOTSTRAP INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Set tab based on router hash
  const hash = window.location.hash.slice(2);
  const validTabs: Array<typeof state.activeTab> = ['dashboard', 'employees', 'clients', 'finance', 'settings', 'pricing', 'chat'];
  if (validTabs.includes(hash as any)) {
    state.activeTab = hash as any;
  }

  // Always boot using the animated Splash Gate preloader
  state.view = 'splash';
  renderApp();
});
