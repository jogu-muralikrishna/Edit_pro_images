# Security Specification - Edit Pro

## Data Invariants
1. A **Project** must belong to a valid `userId` (the creator).
2. Users can only read, update, or delete their own **Projects**.
3. **User** profiles should only be readable and writable by the user themselves (PII isolation).
4. **Templates** are read-only for standard users; only designated admins (if any) can write them.
5. All IDs must be valid strings.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a project with `userId` of another user.
2. **Project Hijacking**: Attempt to read a project document ID that belongs to another user.
3. **Ghost Update**: Attempt to update a project's `userId` field to a different value.
4. **PII Leak**: Attempt to read another user's profile in the `users` collection.
5. **Template Vandalism**: Attempt to delete or update a global template.
6. **ID Poisoning**: Attempt to create a project with a 2MB string as the document ID.
7. **Resource Exhaustion**: Attempt to write a 1MB string into a small metadata field like `name`.
8. **Orphaned Write**: Attempt to create a project without being authenticated.
9. **Terminal State Bypass**: (N/A for this app, but relevant if we had "published" status).
10. **Sync Vulnerability**: (N/A for this app, no multi-doc atomicity required yet).
11. **Malicious Query**: Attempt to list all projects without a `where` clause for `userId`.
12. **Timestamp Fraud**: Attempt to set `createdAt` to a date in the past instead of `request.time`.

## Test Runner - firestore.rules.test.ts

```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, query, collection, where, getDocs } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "edit-pro-test",
    firestore: {
      rules: require("fs").readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Project Access", () => {
  it("should deny unauthenticated project creation", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauthedDb, "projects", "p1"), { name: "Test" }));
  });

  it("should allow owner to read their own project", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const projectRef = doc(aliceDb, "projects", "p1");
    // We need to use withSecurityRulesDisabled to seed data if rules prevent creation of others
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "projects", "p1"), { userId: "alice", name: "Alice's Project" });
    });
    await assertSucceeds(getDoc(projectRef));
  });

  it("should deny non-owner from reading a project", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "projects", "p1"), { userId: "alice", name: "Alice's Project" });
    });
    const projectRef = doc(bobDb, "projects", "p1");
    await assertFails(getDoc(projectRef));
  });
});
```
