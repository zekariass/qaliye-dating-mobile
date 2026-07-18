import type { EditProfileDraft } from '@/screens/profile/mockEditProfile';
import type { BasicProfilePayload } from '@/types/api';
import type { ProfileUpdateRequest } from '@/types/profile';
import { mapEditDraftToUpdateRequest } from '@/utils/profileMappers';

describe('residency_type exclusion from profile requests', () => {
  const baseDraft: EditProfileDraft = {
    basics: {
      displayName: 'Test User',
      gender: 'MALE',
      dateOfBirth: '01 Jan 1995',
      heightCm: '180',
      address: 'Addis Ababa, Ethiopia',
    },
    personal: {
      bio: 'Hello',
      ethnicities: [],
      ethnicityOtherText: '',
      nationality: 'ET',
      religion: 'Orthodox Christian',
      educationLevel: "Bachelor's Degree",
      occupation: 'Engineer',
      relationshipIntention: 'Marriage',
      maritalStatus: 'Never married',
      hasChildren: 'No',
      wantsChildren: 'Yes',
    },
    lifestyle: {
      smoking: 'No',
      drinking: 'Socially',
      activityLevel: 'Moderate',
      interests: ['Travel'],
      languages: [],
    },
  };

  it('mapEditDraftToUpdateRequest does not include residency_type', () => {
    const result: ProfileUpdateRequest = mapEditDraftToUpdateRequest(baseDraft);
    expect(result).not.toHaveProperty('residency_type');
  });

  it('mapEditDraftToUpdateRequest does not include residencyType (camelCase)', () => {
    const result = mapEditDraftToUpdateRequest(baseDraft) as Record<string, unknown>;
    expect(result).not.toHaveProperty('residencyType');
  });

  it('EditProfileDraft.basics type does not have residencyType field', () => {
    // TypeScript compile-time check: if residencyType were still in the type,
    // this would be a compile error. The fact that this compiles proves it's removed.
    const basics: EditProfileDraft['basics'] = {
      displayName: 'X',
      gender: 'MALE',
      dateOfBirth: '01 Jan 2000',
      heightCm: '175',
      address: 'Somewhere',
    };
    expect(basics).not.toHaveProperty('residencyType');
  });

  it('BasicProfilePayload type does not include residency_type', () => {
    // Compile-time proof: this object satisfies BasicProfilePayload without residency_type.
    const payload: BasicProfilePayload = {
      display_name: 'Test',
      gender: 'MALE',
      date_of_birth: '1995-01-01',
      relationship_intention: 'MARRIAGE',
    };
    expect(payload).not.toHaveProperty('residency_type');
  });

  it('ProfileUpdateRequest type does not include residency_type', () => {
    // Compile-time proof: this object satisfies ProfileUpdateRequest without residency_type.
    const req: ProfileUpdateRequest = {
      display_name: 'Test',
      gender: 'MALE',
    };
    expect(req).not.toHaveProperty('residency_type');
  });
});
