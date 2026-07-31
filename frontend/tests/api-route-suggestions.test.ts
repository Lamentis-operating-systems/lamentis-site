import { describe, expect, it } from "vitest";
import {
  deriveApiRouteSuggestions,
  synchronizePathParameters,
} from "@/domain/site/api-route-suggestions";

describe("API route suggestions", () => {
  it("derives editable operation, model, status, and UUID parameter defaults", () => {
    expect(deriveApiRouteSuggestions("GET", "/users/{uuid}")).toEqual({
      operationId: "getUserByUuid",
      parameters: [{
        format: "uuid",
        location: "path",
        name: "uuid",
        required: true,
        type: "string",
      }],
      requestTypeName: "",
      responseStatus: "200",
      responseTypeName: "UserResponse",
      title: "Get user",
    });
    expect(deriveApiRouteSuggestions("POST", "/users")).toMatchObject({
      operationId: "createUser",
      requestTypeName: "CreateUserRequest",
      responseStatus: "201",
      responseTypeName: "UserResponse",
      title: "Create user",
    });
    expect(deriveApiRouteSuggestions("DELETE", "/users/{uuid}"))
      .toMatchObject({
        operationId: "deleteUserByUuid",
        responseStatus: "204",
      });
  });

  it("keeps explicit non-path parameters while synchronizing path parameters", () => {
    expect(synchronizePathParameters([{
      location: "query",
      name: "limit",
      required: false,
      type: "integer",
    }], "/users/{uuid}")).toEqual([
      {
        format: "uuid",
        location: "path",
        name: "uuid",
        required: true,
        type: "string",
      },
      {
        location: "query",
        name: "limit",
        required: false,
        type: "integer",
      },
    ]);
  });
});
