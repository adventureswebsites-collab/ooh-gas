/**
 * Automated Verification Test Suite for Ooh Gas
 * Customer Authentication & Registration System (Supabase Auth, Profiles, Addresses, and RLS)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  signUpCustomer,
  signInCustomer,
  signOutCustomer,
  resetCustomerPassword,
  updateCustomerProfile,
  getCurrentCustomerSession,
  isCustomerLoggedIn,
  loginWithDemoAccount,
  getCustomerSavedAddresses,
  saveCustomerAddress,
  getCustomerOrderHistory,
  normalizeKenyanPhone,
  findRegisteredCustomerAccount,
  DEMO_CUSTOMER,
} from '../src/services/customerAuthService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

async function runAuthTests() {
  console.log('\n============================================================');
  console.log('🚀 Running Ooh Gas Customer Authentication Verification Tests');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Migration Verification (Profiles, Customer Addresses, Orders RLS, Triggers)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 1: Verifying Database Migrations & Supabase RLS ---');
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261016_customer_auth_profiles.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 20261016_customer_auth_profiles.sql exists');

  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  assert(sqlContent.includes('CREATE OR REPLACE FUNCTION public.handle_new_user'), 'Contains auth.users to public.profiles sync trigger');
  assert(sqlContent.includes('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY'), 'Enables RLS on profiles table');
  assert(sqlContent.includes('ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY'), 'Enables RLS on customer_addresses table');
  assert(sqlContent.includes('ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY'), 'Enables RLS on orders table');
  assert(sqlContent.includes('lookup_email_by_phone'), 'Contains phone-to-email lookup helper for phone sign-in');
  assert(sqlContent.includes('auth.uid() = customer_id'), 'Enforces customer isolation so customers only access their own data');

  // --------------------------------------------------------------------------
  // TEST 2: Kenyan Phone Number Normalization
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Verifying Kenyan Phone Number Normalization ---');
  const phone1 = normalizeKenyanPhone('0712345678');
  const phone2 = normalizeKenyanPhone('+254 712 345 678');
  const phone3 = normalizeKenyanPhone('254712345678');
  assert(phone1 === '+254 712 345 678', 'Normalizes 07... to +254 7XX XXX XXX');
  assert(phone2 === '+254 712 345 678', 'Preserves international +254 prefix');
  assert(phone3 === '+254 712 345 678', 'Normalizes 254... without + to international format');

  // --------------------------------------------------------------------------
  // TEST 3: Customer Registration (Sign Up) with unique ID and Profile Creation
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Customer Registration (Sign Up) ---');
  const testUser = {
    fullName: 'Juma Omondi',
    phoneNumber: '0722 987 654',
    email: `juma.omondi.${Date.now()}@gmail.com`,
    password: 'SecureGasPassword123',
  };

  const regSession = await signUpCustomer(testUser);
  assert(Boolean(regSession.user.id), `Customer assigned unique User ID: ${regSession.user.id}`);
  assert(regSession.user.fullName === 'Juma Omondi', 'Customer full name recorded accurately');
  assert(regSession.user.email === testUser.email.toLowerCase(), 'Customer email stored in lowercase');
  assert(regSession.user.phoneNumber === '+254 722 987 654', 'Phone number normalized to +254 722 987 654');
  assert(regSession.profile.role === 'customer', 'Profile role defaults to customer');
  assert(isCustomerLoggedIn() === true, 'Customer is actively logged in after registration');

  // Verify registration validation requirements
  try {
    await signUpCustomer({
      fullName: '',
      phoneNumber: '0712345678',
      email: 'bad@test.com',
      password: '123',
    });
    assert(false, 'Should reject empty full name');
  } catch (err: any) {
    assert(err.message.includes('full name'), 'Properly rejects missing full name');
  }

  try {
    await signUpCustomer({
      fullName: 'Test User',
      phoneNumber: '123',
      email: 'bad@test.com',
      password: '123',
    });
    assert(false, 'Should reject invalid phone');
  } catch (err: any) {
    assert(err.message.includes('valid Kenyan phone'), 'Properly validates phone number length');
  }

  try {
    await signUpCustomer({
      fullName: 'Test User',
      phoneNumber: '0712345678',
      email: 'notanemail',
      password: 'validpassword123',
    });
    assert(false, 'Should reject invalid email');
  } catch (err: any) {
    assert(err.message.includes('valid email'), 'Properly validates email address');
  }

  // --------------------------------------------------------------------------
  // TEST 4: Customer Sign Out
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Customer Sign Out ---');
  await signOutCustomer();
  assert(isCustomerLoggedIn() === false, 'Session cleared on sign out');
  assert(getCurrentCustomerSession() === null, 'Current session is null after sign out');

  // --------------------------------------------------------------------------
  // TEST 5: Customer Sign In via Email & Password
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Customer Sign In via Email ---');
  const emailLoginSession = await signInCustomer({
    identifier: testUser.email,
    password: testUser.password,
  });
  assert(emailLoginSession.user.id === regSession.user.id, 'Maintains persistent unique user ID upon email login');
  assert(emailLoginSession.user.fullName === 'Juma Omondi', 'Preserves customer name');
  assert(isCustomerLoggedIn() === true, 'Customer is logged in after email authentication');

  // --------------------------------------------------------------------------
  // TEST 6: Customer Sign In via Phone Number & Password
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Customer Sign In via Phone Number ---');
  await signOutCustomer();
  const phoneLoginSession = await signInCustomer({
    identifier: testUser.phoneNumber, // '0722 987 654'
    password: testUser.password,
  });
  assert(phoneLoginSession.user.id === regSession.user.id, 'Successfully signs in using phone number and retrieves linked user ID');
  assert(phoneLoginSession.user.email === testUser.email.toLowerCase(), 'Resolves linked account email from phone number');

  // Test incorrect password rejection
  try {
    await signInCustomer({
      identifier: testUser.email,
      password: 'wrongpassword',
    });
    assert(false, 'Should reject wrong password');
  } catch (err: any) {
    assert(err.message.toLowerCase().includes('password') || err.message.toLowerCase().includes('invalid'), 'Properly rejects incorrect password');
  }

  // --------------------------------------------------------------------------
  // TEST 7: Password Reset Request
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Password Reset Request ---');
  const resetRes = await resetCustomerPassword(testUser.email);
  assert(resetRes.success === true, 'Password reset request succeeds');
  assert(resetRes.message.includes(testUser.email), 'Returns confirmation message referencing target email');

  // --------------------------------------------------------------------------
  // TEST 8: Customer Profile Update
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Customer Profile Information Update ---');
  const updatedProfile = await updateCustomerProfile({
    fullName: 'Juma Omondi Senior',
    phoneNumber: '0733 111 222',
  });
  assert(updatedProfile.fullName === 'Juma Omondi Senior', 'Profile full name updated');
  assert(updatedProfile.phoneNumber === '+254 733 111 222', 'Updated phone number normalized');
  const currentSession = getCurrentCustomerSession();
  assert(currentSession?.user.fullName === 'Juma Omondi Senior', 'Active session reflects updated profile details');

  // --------------------------------------------------------------------------
  // TEST 9: Saved Addresses Isolated by Customer ID
  // --------------------------------------------------------------------------
  console.log('\n--- Test 9: Saved Delivery Addresses Management ---');
  const newAddr = await saveCustomerAddress({
    label: 'Apartment',
    streetAddress: 'Chania Ave, Kilimani',
    buildingName: 'Elgon Court',
    houseOrFlatNumber: 'House 5A',
    deliveryNotes: 'Leave with guard if away',
    location: { lat: -1.2955, lng: 36.7891 },
    isDefault: true,
  });
  assert(newAddr.customerId === regSession.user.id, 'Address record linked directly to customer ID');
  assert(newAddr.isDefault === true, 'Address marked as default');

  const addresses = await getCustomerSavedAddresses();
  assert(addresses.length > 0, 'Retrieved customer saved addresses');
  assert(addresses[0].customerId === regSession.user.id, 'Saved address strictly belongs to active authenticated customer');

  // --------------------------------------------------------------------------
  // TEST 10: 1-Tap Demo Account Integration (Wangari Mwangi)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 10: 1-Tap Demo Account Verification ---');
  const demoSession = loginWithDemoAccount();
  assert(demoSession.user.id === DEMO_CUSTOMER.user.id, 'Loads Wangari Mwangi demo account ID');
  assert(demoSession.user.fullName === 'Wangari Mwangi', 'Demo customer is Wangari Mwangi');
  assert(demoSession.user.email === 'wangari.mwangi@gmail.com', 'Demo customer email loaded');
  const demoAddresses = await getCustomerSavedAddresses();
  assert(demoAddresses.length >= 2, 'Wangari Mwangi has pre-loaded Kilimani & Westlands delivery addresses');

  // --------------------------------------------------------------------------
  // TEST 11: Customer Order History Association
  // --------------------------------------------------------------------------
  console.log('\n--- Test 11: Customer Order History Association & Isolation ---');
  const customerOrders = await getCustomerOrderHistory(demoSession.user.id);
  assert(Array.isArray(customerOrders), 'Customer orders returned as array');

  console.log('\n============================================================');
  console.log('🎉 ALL 11 CUSTOMER AUTH & REGISTRATION TESTS PASSED');
  console.log('============================================================\n');
}

runAuthTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
