import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchDiscoveryProfiles } from '@/api/discovery/discoveryApi';
import { CardDto } from '@/components/discovery/ProfileCard';
import type { DiscoveryProfileDto } from '@/types/discovery';

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mapProfileToCard(p: DiscoveryProfileDto): CardDto {
  // The backend currently returns snake_case fields, while the docs/types
  // define camelCase. Read both shapes so the screen works either way.
  const profile = p as any;
  const profilePhotos: any[] = profile.photos ?? [];
  const sortedPhotos = profilePhotos
    .map((ph) => ({
      id: ph.id,
      photoOrder: ph.photoOrder ?? ph.photo_order ?? ph.order ?? 0,
      isPrimary: ph.isPrimary ?? ph.is_primary ?? false,
      signedUrl: ph.signedUrl ?? ph.signed_url ?? ph.url,
      expiresAt: ph.expiresAt ?? ph.expires_at,
    }))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.photoOrder - b.photoOrder;
    });

  return {
    user_id: profile.userId ?? profile.user_id,
    display_name: profile.displayName ?? profile.display_name,
    age: profile.age,
    distance_km: profile.distanceKm ?? profile.distance_km,
    is_verified: profile.isVerified ?? profile.is_verified,
    relationship_intention: (profile.relationshipIntention ?? profile.relationship_intention) ?? '',
    residency_type: profile.residencyType ?? profile.residency_type,
    city: (profile.city ?? profile.city_name ?? profile.cityName) ?? '',
    country_name: (profile.countryName ?? profile.country_name) ?? '',
    photos: sortedPhotos.map((ph) => ({ image_url: ph.signedUrl })),
    bio: (profile.bio ?? profile.about) ?? undefined,
    gender: profile.gender,
    height_cm: (profile.heightCm ?? profile.height_cm) ?? undefined,
    ethnicities: (profile.ethnicities ?? profile.ethnic_backgrounds ?? []).map((e: any) =>
      typeof e === 'string' ? { id: e, name: formatLabel(e) } : { id: e.id ?? e.value, name: e.name ?? formatLabel(e.value ?? e.id) }
    ),
    ethnicityOtherText: profile.ethnicityOtherText ?? profile.ethnicity_other_text ?? null,
    languages: (profile.languages ?? []).map((l: any) =>
      typeof l === 'string' ? { id: l, name: formatLabel(l) } : { id: l.id ?? l.value, name: l.name ?? formatLabel(l.value ?? l.id) }
    ),
    nationality: (profile.nationality ?? profile.nationality_country) ?? undefined,
    religion: (profile.religion ?? profile.religious_affiliation) ?? undefined,
    education_level: (profile.educationLevel ?? profile.education_level) ?? undefined,
    occupation: (profile.occupation ?? profile.job_title) ?? undefined,
    marital_status: (profile.maritalStatus ?? profile.marital_status) ?? undefined,
    has_children: profile.hasChildren ?? profile.has_children,
    wants_children: (profile.wantsChildren ?? profile.wants_children) ?? undefined,
    smoking: profile.smoking,
    drinking: profile.drinking,
    smoking_detail: (profile.smokingDetail ?? profile.smoking_detail) ?? null,
    drinking_detail: (profile.drinkingDetail ?? profile.drinking_detail) ?? null,
    activity_level: (profile.activityLevel ?? profile.activity_level) ?? null,
    interests: profile.interests ?? [],
    prompt_answers: (profile.promptAnswers ?? profile.prompt_answers ?? []).map((pa: any) => ({
      promptText: pa.promptText ?? pa.prompt_text ?? pa.prompt,
      answerText: pa.answerText ?? pa.answer_text ?? pa.answer,
    })),
    activity_status: profile.activity_status ?? profile.activityStatus,
  };
}

export function useDiscoveryProfiles() {
  const query = useInfiniteQuery({
    queryKey: ['discovery', 'profiles'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchDiscoveryProfiles(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const cards = useMemo(
    () => query.data?.pages.flatMap((page) => page.profiles.map(mapProfileToCard)) ?? [],
    [query.data],
  );

  const cursorReset =
    (query.data?.pages[query.data.pages.length - 1]?.cursorReset) ?? false;

  // True when the query is doing a background refetch of ALL pages (not pagination,
  // not initial load). This fires after preference changes / query invalidations.
  const isRefetching =
    query.isFetching && !query.isFetchingNextPage && query.data !== undefined;

  return { ...query, cards, cursorReset, isRefetching };
}
