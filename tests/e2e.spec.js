const { test, expect } = require('@playwright/test');

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function signUp(page, username = `e2e_${uniqueSuffix()}`) {
  await page.goto('/auth/signup');

  const nameInput = page.getByLabel('Name', { exact: true });
  const emailInput = page.getByLabel('Email', { exact: true });
  const usernameInput = page.getByLabel('Username', { exact: true });
  const passwordInput = page.getByLabel('Password', { exact: true });

  await expect(nameInput).toBeEditable();
  await expect(emailInput).toBeEditable();
  await expect(usernameInput).toBeEditable();
  await expect(passwordInput).toBeEditable();

  await nameInput.fill('E2E Test User');
  await emailInput.fill(`${username}@example.com`);
  await usernameInput.fill(username);
  await passwordInput.fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Create a poll' })).toBeVisible();

  return username;
}

async function createPoll(page, pollQuestion, firstOption = 'Blue', secondOption = 'Green') {
  const questionInput = page.getByPlaceholder('What do you want to ask?');
  const firstOptionInput = page.getByPlaceholder('Option 1');
  const secondOptionInput = page.getByPlaceholder('Option 2');

  await expect(questionInput).toBeEditable();
  await expect(firstOptionInput).toBeEditable();
  await expect(secondOptionInput).toBeEditable();

  await questionInput.fill(pollQuestion);
  await firstOptionInput.fill(firstOption);
  await secondOptionInput.fill(secondOption);
  await page.getByRole('button', { name: 'Create poll' }).click();

  const pollDetail = page.locator('.poll-detail');
  await expect(pollDetail.getByRole('heading', { name: pollQuestion })).toBeVisible();
  await expect(page.locator('.poll-card', { hasText: pollQuestion })).toBeVisible();

  return pollDetail;
}

test('user can sign up, reach the dashboard, log out, and log back in', async ({ page }) => {
  const username = await signUp(page);

  await expect(page.getByText(username)).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Polls that bring UCLA students together' })).toBeVisible();

  await page.goto('/auth/login');

  const loginUsernameInput = page.getByLabel('Username', { exact: true });
  const loginPasswordInput = page.getByLabel('Password', { exact: true });
  await expect(loginUsernameInput).toBeEditable();
  await expect(loginPasswordInput).toBeEditable();

  await loginUsernameInput.fill(username);
  await loginPasswordInput.fill('password123');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(username)).toBeVisible();
});

test('user can create a poll, vote, and see results update', async ({ page }) => {
  await signUp(page);

  const pollQuestion = `E2E favorite color ${uniqueSuffix()}`;
  const pollDetail = await createPoll(page, pollQuestion);

  await pollDetail.getByRole('button', { name: /Blue\s+0 votes/i }).click();

  await expect(pollDetail.getByRole('button', { name: /Blue\s+1 votes/i })).toBeVisible();
  await expect(pollDetail.locator('.poll-total')).toHaveText('1 vote');
  await expect(pollDetail.locator('.chart-row', { hasText: 'Blue' })).toContainText('1 (100%)');
});

test('user can follow another user and see their polls in the following feed', async ({ page }) => {
  const followedUsername = await signUp(page);
  const followedPollQuestion = `E2E followed user poll ${uniqueSuffix()}`;
  await createPoll(page, followedPollQuestion, 'Westwood', 'Ackerman');

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);

  await signUp(page);

  await page.getByRole('button', { name: 'Users' }).click();
  const searchInput = page.getByPlaceholder('Search users...');
  await expect(searchInput).toBeEditable();
  await searchInput.fill(followedUsername);

  const userResult = page.locator('.user-result', { hasText: followedUsername });
  await expect(userResult).toBeVisible();
  await userResult.getByRole('button', { name: 'Follow' }).click();
  await expect(page.getByPlaceholder('Search polls...')).toBeEditable();

  await page.getByRole('button', { name: 'Following' }).click();

  await expect(page.locator('.poll-card', { hasText: followedPollQuestion })).toBeVisible();
  await expect(page.locator('.poll-detail').getByRole('heading', { name: followedPollQuestion })).toBeVisible();
});

test('user can search polls by question text', async ({ page }) => {
  await signUp(page);

  const visibleQuestion = `E2E searchable poll ${uniqueSuffix()}`;
  const hiddenQuestion = `E2E hidden poll ${uniqueSuffix()}`;

  await createPoll(page, visibleQuestion, 'North Campus', 'South Campus');
  await createPoll(page, hiddenQuestion, 'Bruin Plate', 'De Neve');

  const searchInput = page.getByPlaceholder('Search polls...');
  await expect(searchInput).toBeEditable();
  await searchInput.fill(visibleQuestion);

  const visiblePollCard = page.locator('.poll-card', { hasText: visibleQuestion });
  await expect(visiblePollCard).toBeVisible();
  await expect(page.locator('.poll-card', { hasText: hiddenQuestion })).toHaveCount(0);
  await visiblePollCard.click();
  await expect(page.locator('.poll-detail').getByRole('heading', { name: visibleQuestion })).toBeVisible();
});
