/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/// <reference types="cypress" />

import request from "browser-request";

import type { MatrixClient } from "matrix-js-sdk/src/client";
import { SynapseInstance } from "../plugins/synapsedocker";
import Chainable = Cypress.Chainable;

interface INewMatrixClientOptions {
    userId: string;
    accessToken: string;
    deviceId?: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            /**
             * Returns a new Bot instance
             * @param synapse the instance on which to register the bot user
             * @param displayName the display name to give to the bot user
             */
            getBot(synapse: SynapseInstance, displayName?: string): Chainable<MatrixClient>;
            /**
             * Create a new Matrix client to interact with the API as user
             * separate from the one logged in
             * @param synapse the instance on which to register the bot user
             * @param opts Options to pass when creating a new Matrix client
             *     like `userId` and `accessToken`
             */
            newMatrixClient(synapse: SynapseInstance, opts: INewMatrixClientOptions): Chainable<MatrixClient>;
        }
    }
}

Cypress.Commands.add("newMatrixClient", (
    synapse: SynapseInstance,
    { userId, accessToken, deviceId }: INewMatrixClientOptions,
): Chainable<MatrixClient> => {
    return cy.window({ log: false }).then(win => {
        const cli = new win.matrixcs.MatrixClient({
            baseUrl: synapse.baseUrl,
            userId,
            deviceId,
            accessToken,
            request,
        });

        cli.on(win.matrixcs.RoomMemberEvent.Membership, (event, member) => {
            if (member.membership === "invite" && member.userId === cli.getUserId()) {
                cli.joinRoom(member.roomId);
            }
        });

        cli.startClient();

        return cli;
    });
});

Cypress.Commands.add("getBot", (synapse: SynapseInstance, displayName?: string): Chainable<MatrixClient> => {
    const username = Cypress._.uniqueId("userId_");
    const password = Cypress._.uniqueId("password_");
    return cy.registerUser(synapse, username, password, displayName).then(credentials => {
        return cy.newMatrixClient(synapse, {
            userId: credentials.userId,
            deviceId: credentials.deviceId,
            accessToken: credentials.accessToken,
        });
    });
});