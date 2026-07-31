import { describe, expect, it } from "vitest";
import {
  createResponseDraftFields,
  draftFieldsToApiResponseSchema,
  duplicateResponseDraftFieldIds,
  responseSchemaDraftReducer,
  updateDraftFieldsAtSchemaPath,
  type ResponseSchemaDraftState,
} from "@/domain/site/response-schema-draft";

const initialState: ResponseSchemaDraftState = {
  fields: [],
  issue: null,
  selectedTemplateTypeName: "",
  typeName: "",
};

describe("response-schema draft state", () => {
  it("round-trips nested schemas while allocating stable field ids", () => {
    const result = createResponseDraftFields([
      {
        name: "profile",
        objectSchema: {
          fields: [
            { name: "id", optional: false, type: "number" },
          ],
          typeName: "UserResponseProfile",
        },
        optional: false,
        type: "object",
      },
      {
        arrayItemType: "string",
        name: "tags",
        optional: true,
        type: "array",
      },
    ], 4);

    expect(result.nextId).toBe(7);
    expect(result.fields.map(({ id }) => id)).toEqual([4, 6]);
    expect(result.fields[0]?.objectSchema?.fields[0]?.id).toBe(5);
    expect(draftFieldsToApiResponseSchema(
      "UserResponse",
      result.fields,
    )).toEqual({
      fields: [
        {
          name: "profile",
          objectSchema: {
            fields: [
              { name: "id", optional: false, type: "number" },
            ],
            typeName: "UserResponseProfile",
          },
          optional: false,
          type: "object",
        },
        {
          arrayItemType: "string",
          name: "tags",
          optional: true,
          type: "array",
        },
      ],
      typeName: "UserResponse",
    });
  });

  it("updates only the selected nested schema branch", () => {
    const { fields } = createResponseDraftFields([
      {
        name: "left",
        objectSchema: {
          fields: [
            { name: "value", optional: false, type: "string" },
          ],
          typeName: "Left",
        },
        optional: false,
        type: "object",
      },
      {
        name: "right",
        objectSchema: {
          fields: [],
          typeName: "Right",
        },
        optional: false,
        type: "object",
      },
    ]);
    const left = fields[0]!;
    const right = fields[1]!;
    const next = updateDraftFieldsAtSchemaPath(
      fields,
      [left.id],
      (nestedFields) => nestedFields.map((field) => ({
        ...field,
        name: "changed",
      })),
    );

    expect(next).not.toBe(fields);
    expect(next[0]?.objectSchema?.fields[0]?.name).toBe("changed");
    expect(next[1]).toBe(right);
  });

  it("detects duplicate names independently at every object depth", () => {
    const { fields } = createResponseDraftFields([
      { name: "id", optional: false, type: "string" },
      { name: "id", optional: true, type: "number" },
      {
        name: "profile",
        objectSchema: {
          fields: [
            { name: "id", optional: false, type: "string" },
            { name: "id", optional: false, type: "number" },
          ],
          typeName: "Profile",
        },
        optional: false,
        type: "object",
      },
    ]);

    expect([...duplicateResponseDraftFieldIds(fields)].sort())
      .toEqual([0, 1, 3, 4]);
  });

  it("detaches edited templates without making derived conflicts sticky", () => {
    const selected = responseSchemaDraftReducer(initialState, {
      fields: [{
        arrayItemType: "string",
        id: 0,
        name: "id",
        optional: false,
        type: "string",
      }],
      selectedTemplateTypeName: "UserResponse",
      type: "prefill",
      typeName: "UserResponse",
    });
    const edited = responseSchemaDraftReducer(selected, {
      editedSchemaPath: [],
      fields: selected.fields.map((field) => ({
        ...field,
        type: "number",
      })),
      type: "commit-fields",
    });

    expect(edited).toMatchObject({
      issue: null,
      selectedTemplateTypeName: "",
      typeName: "UserResponse",
    });

    const restored = responseSchemaDraftReducer(edited, {
      editedSchemaPath: [],
      fields: selected.fields,
      type: "commit-fields",
    });
    expect(restored).toMatchObject({
      issue: null,
      selectedTemplateTypeName: "",
      typeName: "UserResponse",
    });
  });

  it("detaches only the edited nested object template", () => {
    const { fields } = createResponseDraftFields([
      {
        name: "profile",
        objectSchema: {
          fields: [
            { name: "id", optional: false, type: "string" },
          ],
          typeName: "Profile",
        },
        optional: false,
        type: "object",
      },
    ]);
    const profile = fields[0]!;
    const state = responseSchemaDraftReducer(
      { ...initialState, fields, typeName: "UserResponse" },
      {
        editedSchemaPath: [profile.id],
        fields: updateDraftFieldsAtSchemaPath(
          fields,
          [profile.id],
          (nested) => nested.map((field) => ({
            ...field,
            name: "displayName",
          })),
        ),
        type: "commit-fields",
      },
    );

    expect(state.issue).toBeNull();
    expect(state.fields[0]?.objectSchema).toMatchObject({
      selectedTemplateTypeName: "",
      fields: [{ name: "displayName" }],
    });
  });
});
