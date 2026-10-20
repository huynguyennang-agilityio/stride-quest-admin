// Fixtures are the contract examples themselves (contract/examples), never hand-written
// copies. The backend's tests check the same files, so both sides agree on the shapes.
import authResponse from "../../contract/examples/auth/auth_response.json";
import authErrorInvalidCredentials from "../../contract/examples/auth/error_invalid_credentials.json";
import authErrorValidation from "../../contract/examples/auth/error_validation.json";
import tokenPair from "../../contract/examples/auth/token_pair.json";
import user from "../../contract/examples/auth/user.json";
import challenge from "../../contract/examples/challenges/challenge.json";
import challengeCreateRequest from "../../contract/examples/challenges/challenge_create_request.json";
import challengeDetail from "../../contract/examples/challenges/challenge_detail.json";
import challengePage from "../../contract/examples/challenges/challenge_page.json";
import challengeUpdateRequest from "../../contract/examples/challenges/challenge_update_request.json";
import challengeErrorInUse from "../../contract/examples/challenges/error_challenge_in_use.json";
import challengeErrorForbidden from "../../contract/examples/challenges/error_forbidden.json";
import challengeErrorInvalidCursor from "../../contract/examples/challenges/error_invalid_cursor.json";
import quest from "../../contract/examples/challenges/quest.json";
import questCreateRequest from "../../contract/examples/challenges/quest_create_request.json";
import uploadedImage from "../../contract/examples/challenges/uploaded_image.json";

import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

// JSON imports widen literals ("user" becomes string), so each example is typed with its
// contract schema here.
export const fixtures = {
  auth: {
    authResponse: authResponse as Schemas["AuthResponse"],
    tokenPair: tokenPair as Schemas["TokenPair"],
    user: user as Schemas["UserRead"],
    errorInvalidCredentials: authErrorInvalidCredentials as Schemas["ErrorResponse"],
    errorValidation: authErrorValidation as Schemas["ErrorResponse"],
  },
  challenges: {
    challenge: challenge as Schemas["ChallengeRead"],
    challengeDetail: challengeDetail as Schemas["ChallengeDetail"],
    challengePage: challengePage as Schemas["ChallengePage"],
    challengeCreateRequest: challengeCreateRequest as Schemas["ChallengeCreate"],
    challengeUpdateRequest: challengeUpdateRequest as Schemas["ChallengeUpdate"],
    quest: quest as Schemas["QuestSummary"],
    questCreateRequest: questCreateRequest as Schemas["QuestCreate"],
    uploadedImage: uploadedImage as Schemas["UploadedImageRead"],
    errorInUse: challengeErrorInUse as Schemas["ErrorResponse"],
    errorForbidden: challengeErrorForbidden as Schemas["ErrorResponse"],
    errorInvalidCursor: challengeErrorInvalidCursor as Schemas["ErrorResponse"],
  },
};
