// firebase/reviews.js

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';

const REVIEWS_COLLECTION = 'reviews';

/**
 * Normalize review data.
 */
function normalizeReviewData(id, data = {}) {
  return {
    id,

    appId: data.appId || '',
    botId: data.botId || '',
    targetId: data.targetId || data.appId || data.botId || '',

    targetType:
      data.targetType ||
      (data.botId ? 'bot' : 'mini_app'),

    userId: data.userId || '',
    userName: data.userName || '',
    username: data.username || '',
    userPhotoURL: data.userPhotoURL || '',

    rating: Number(data.rating || 0),
    text: data.text || '',

    helpfulCount: Number(data.helpfulCount || 0),

    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,

    ...data,

    id,
  };
}

/**
 * Validate rating.
 */
export function isValidRating(rating) {
  const value = Number(rating);

  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

/**
 * Clean review text.
 */
export function normalizeReviewText(text = '') {
  return String(text || '')
    .trim()
    .slice(0, 1000);
}

/**
 * Get reviews for a mini-app or bot.
 */
export async function getReviews(
  targetId,
  targetType = 'mini_app',
  limitCount = 50
) {
  if (!targetId) {
    return [];
  }

  const reviewsRef = collection(
    db,
    REVIEWS_COLLECTION
  );

  const q = query(
    reviewsRef,
    where('targetId', '==', targetId),
    where('targetType', '==', targetType),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeReviewData(
      item.id,
      item.data()
    )
  );
}

/**
 * Get reviews for a mini-app.
 */
export async function getMiniAppReviews(
  appId,
  limitCount = 50
) {
  return getReviews(
    appId,
    'mini_app',
    limitCount
  );
}

/**
 * Get reviews for a bot.
 */
export async function getBotReviews(
  botId,
  limitCount = 50
) {
  return getReviews(
    botId,
    'bot',
    limitCount
  );
}

/**
 * Create a review.
 */
export async function createReview({
  targetId,
  targetType = 'mini_app',

  appId,
  botId,

  userId,
  userName = '',
  username = '',
  userPhotoURL = '',

  rating,
  text = '',
}) {
  if (!targetId) {
    throw new Error('Review target is required.');
  }

  if (!userId) {
    throw new Error('User ID is required.');
  }

  if (!isValidRating(rating)) {
    throw new Error(
      'Rating must be a whole number from 1 to 5.'
    );
  }

  const reviewText =
    normalizeReviewText(text);

  const payload = {
    targetId,
    targetType,

    appId: appId || (
      targetType === 'mini_app'
        ? targetId
        : ''
    ),

    botId: botId || (
      targetType === 'bot'
        ? targetId
        : ''
    ),

    userId,

    userName: String(
      userName || ''
    ).trim(),

    username: String(
      username || ''
    )
      .trim()
      .replace(/^@/, ''),

    userPhotoURL: String(
      userPhotoURL || ''
    ).trim(),

    rating: Number(rating),

    text: reviewText,

    helpfulCount: 0,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reviewsRef = collection(
    db,
    REVIEWS_COLLECTION
  );

  const docRef = await addDoc(
    reviewsRef,
    payload
  );

  return {
    id: docRef.id,
    ...payload,
  };
}

/**
 * Update an existing review.
 *
 * Only fields relevant to a review can be changed.
 */
export async function updateReview(
  reviewId,
  {
    rating,
    text,
  } = {}
) {
  if (!reviewId) {
    throw new Error(
      'Review ID is required.'
    );
  }

  const updates = {
    updatedAt: serverTimestamp(),
  };

  if (rating !== undefined) {
    if (!isValidRating(rating)) {
      throw new Error(
        'Rating must be a whole number from 1 to 5.'
      );
    }

    updates.rating = Number(rating);
  }

  if (text !== undefined) {
    updates.text =
      normalizeReviewText(text);
  }

  const ref = doc(
    db,
    REVIEWS_COLLECTION,
    reviewId
  );

  await updateDoc(ref, updates);

  return true;
}

/**
 * Delete a review.
 */
export async function deleteReview(
  reviewId
) {
  if (!reviewId) {
    throw new Error(
      'Review ID is required.'
    );
  }

  const ref = doc(
    db,
    REVIEWS_COLLECTION,
    reviewId
  );

  await deleteDoc(ref);

  return true;
}

/**
 * Get reviews written by a user.
 */
export async function getUserReviews(
  userId,
  limitCount = 50
) {
  if (!userId) {
    return [];
  }

  const reviewsRef = collection(
    db,
    REVIEWS_COLLECTION
  );

  const q = query(
    reviewsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) =>
    normalizeReviewData(
      item.id,
      item.data()
    )
  );
}

/**
 * Calculate rating summary locally.
 */
export function calculateRatingSummary(
  reviews = []
) {
  if (!Array.isArray(reviews) ||
      reviews.length === 0) {
    return {
      average: 0,
      count: 0,

      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    };
  }

  const summary = {
    average: 0,
    count: reviews.length,

    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  };

  let total = 0;

  reviews.forEach((review) => {
    const rating = Number(
      review.rating || 0
    );

    total += rating;

    if (rating === 5) {
      summary.fiveStar += 1;
    } else if (rating === 4) {
      summary.fourStar += 1;
    } else if (rating === 3) {
      summary.threeStar += 1;
    } else if (rating === 2) {
      summary.twoStar += 1;
    } else if (rating === 1) {
      summary.oneStar += 1;
    }
  });

  summary.average =
    Math.round(
      (total / reviews.length) * 10
    ) / 10;

  return summary;
}

/**
 * Get rating distribution.
 */
export function getRatingDistribution(
  reviews = []
) {
  const summary =
    calculateRatingSummary(reviews);

  return {
    5: summary.fiveStar,
    4: summary.fourStar,
    3: summary.threeStar,
    2: summary.twoStar,
    1: summary.oneStar,
  };
}

/**
 * Check whether a user has already reviewed
 * a particular target.
 *
 * This is a convenience lookup.
 * For strict one-review-per-user enforcement,
 * use Firestore Security Rules/backend validation.
 */
export async function getUserReviewForTarget(
  userId,
  targetId,
  targetType = 'mini_app'
) {
  if (!userId || !targetId) {
    return null;
  }

  const reviewsRef = collection(
    db,
    REVIEWS_COLLECTION
  );

  const q = query(
    reviewsRef,
    where('userId', '==', userId),
    where('targetId', '==', targetId),
    where('targetType', '==', targetType),
    limit(1)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const item = snapshot.docs[0];

  return normalizeReviewData(
    item.id,
    item.data()
  );
}

/**
 * Get a user's mini-app review.
 */
export async function getUserMiniAppReview(
  userId,
  appId
) {
  return getUserReviewForTarget(
    userId,
    appId,
    'mini_app'
  );
}

/**
 * Get a user's bot review.
 */
export async function getUserBotReview(
  userId,
  botId
) {
  return getUserReviewForTarget(
    userId,
    botId,
    'bot'
  );
}

/**
 * Filter reviews locally.
 */
export function filterReviews(
  reviews = [],
  {
    userId,
    rating,
    minRating,
    maxRating,
    search,
  } = {}
) {
  const normalizedSearch =
    String(search || '')
      .trim()
      .toLowerCase();

  return reviews.filter((review) => {
    if (
      userId &&
      review.userId !== userId
    ) {
      return false;
    }

    if (
      rating !== undefined &&
      Number(review.rating) !==
        Number(rating)
    ) {
      return false;
    }

    if (
      minRating !== undefined &&
      Number(review.rating) <
        Number(minRating)
    ) {
      return false;
    }

    if (
      maxRating !== undefined &&
      Number(review.rating) >
        Number(maxRating)
    ) {
      return false;
    }

    if (normalizedSearch) {
      const text = [
        review.text,
        review.userName,
        review.username,
      ]
        .join(' ')
        .toLowerCase();

      if (!text.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort reviews locally.
 */
export function sortReviews(
  reviews = [],
  sortBy = 'newest'
) {
  const list = [...reviews];

  if (sortBy === 'highest') {
    return list.sort(
      (a, b) =>
        Number(b.rating || 0) -
        Number(a.rating || 0)
    );
  }

  if (sortBy === 'lowest') {
    return list.sort(
      (a, b) =>
        Number(a.rating || 0) -
        Number(b.rating || 0)
    );
  }

  if (sortBy === 'helpful') {
    return list.sort(
      (a, b) =>
        Number(b.helpfulCount || 0) -
        Number(a.helpfulCount || 0)
    );
  }

  return list;
}

/**
 * Get rating stars as an array.
 *
 * Useful for UI components.
 */
export function getRatingStars(rating = 0) {
  const value = Math.max(
    0,
    Math.min(5, Number(rating) || 0)
  );

  return Array.from(
    { length: 5 },
    (_, index) =>
      index < Math.round(value)
  );
}

/**
 * Convert rating to display text.
 */
export function formatRating(
  rating = 0
) {
  const value = Number(rating || 0);

  if (!value) {
    return 'No rating';
  }

  return value.toFixed(1);
}

/**
 * Reviews Firebase API.
 */
export const ReviewFirebase = {
  isValidRating,
  normalizeReviewText,

  getReviews,
  getMiniAppReviews,
  getBotReviews,

  createReview,
  updateReview,
  deleteReview,

  getUserReviews,
  getUserReviewForTarget,

  getUserMiniAppReview,
  getUserBotReview,

  calculateRatingSummary,
  getRatingDistribution,

  filterReviews,
  sortReviews,

  getRatingStars,
  formatRating,
};

export default ReviewFirebase;
