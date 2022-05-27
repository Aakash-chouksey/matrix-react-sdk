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

import React from "react";
import { mount } from "enzyme";
import { act } from 'react-dom/test-utils';
import { Room } from "matrix-js-sdk/src/models/room";
import { PendingEventOrdering } from 'matrix-js-sdk/src/matrix';
import {
    ISyncStateData, SyncState,
} from 'matrix-js-sdk/src/sync';
import { MatrixError } from "matrix-js-sdk/src/http-api";

import { MatrixClientPeg } from "../../../src/MatrixClientPeg";
import { stubClient } from "../../test-utils";
import MatrixClientContext from "../../../src/contexts/MatrixClientContext";
import RoomStatusBar from "../../../src/components/structures/RoomStatusBar";

// Fake date to give a predictable snapshot
const realDateNow = Date.now;
const realDateToISOString = Date.prototype.toISOString;
Date.now = jest.fn(() => 2345678901234);
// eslint-disable-next-line no-extend-native
Date.prototype.toISOString = jest.fn(() => "2021-11-23T14:35:14.240Z");

afterAll(() => {
    Date.now = realDateNow;
    // eslint-disable-next-line no-extend-native
    Date.prototype.toISOString = realDateToISOString;
});

describe("RoomStatusBar", () => {
    let client;
    beforeEach(() => {
        stubClient();
        client = MatrixClientPeg.get();
    });

    it('does not show anything when no sync error or other status', () => {
        const r1 = new Room("r1", client, "@name:example.com", {
            pendingEventOrdering: PendingEventOrdering.Detached,
        });

        const wrapper = mount(<RoomStatusBar room={r1} />, {
            wrappingComponent: MatrixClientContext.Provider,
            wrappingComponentProps: { value: client },
        });
        expect(wrapper).toMatchSnapshot();
    });

    describe('connectivity lost bar', () => {
        it('should show connection lost bar when sync has an error', () => {
            client.getSyncState = (): SyncState => SyncState.Error,
            client.getSyncStateData = (): ISyncStateData => ({
                error: new MatrixError({
                    errcode: 'FAKE_ERROR',
                    error: "Fake sync error",
                }),
            });

            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });

            const wrapper = mount(<RoomStatusBar room={r1} />, {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: client },
            });
            expect(wrapper).toMatchSnapshot();
        });

        it('connectivity lost bar has priority over the timeline refresh bar', () => {
            // Show connectivity lost bar
            client.getSyncState = (): SyncState => SyncState.Error,
            client.getSyncStateData = (): ISyncStateData => ({
                error: new MatrixError({
                    errcode: 'FAKE_ERROR',
                    error: "Fake sync error",
                }),
            });

            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });

            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = mount(<RoomStatusBar room={r1} />, {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: client },
            });
            expect(wrapper).toMatchSnapshot();
        });
    });

    describe('timeline needs refresh bar (history import)', () => {
        it('should show timeline refresh bar when history import detected', () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = mount(<RoomStatusBar room={r1} />, {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: client },
            });
            expect(wrapper).toMatchSnapshot();
        });

        it('should refresh timeline for room when button clicked', () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            r1.refreshLiveTimeline = jest.fn();

            const wrapper = mount(<RoomStatusBar room={r1} />, {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: client },
            });

            const refreshTimelineButton = wrapper.find('AccessibleButton.mx_RoomStatusBar_refreshTimelineBtn');
            refreshTimelineButton.simulate('click');

            // Make sure that the SDK was called to refresh the timeline
            expect(r1.refreshLiveTimeline).toHaveBeenCalled();

            // Expect the refresh timeline bar to be hidden now
            expect(wrapper).toMatchSnapshot();
        });

        it('should show error state with option to submit debug logs ' +
           'in timeline refresh bar when something went wrong while refreshing', () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = mount(<RoomStatusBar room={r1} />, {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: client },
            });
            act(() => {
                wrapper.setState({
                    refreshError: new Error('Fake error in test'),
                });
            });
            expect(wrapper).toMatchSnapshot();
        });


        it('should show error state without submit debug logs option ' +
           'in timeline refresh bar when ConnectionError while refreshing', () => {
            const r1 = new Room("r1", client, "@name:example.com", {
                pendingEventOrdering: PendingEventOrdering.Detached,
            });
            // Show timeline needs refresh bar
            r1.setTimelineNeedsRefresh(true);

            const wrapper = mount(<RoomStatusBar room={r1} />, {
                wrappingComponent: MatrixClientContext.Provider,
                wrappingComponentProps: { value: client },
            });
            act(() => {
                const connectionError = new Error('Fake connection error in test');
                connectionError.name = "ConnectionError";
                wrapper.setState({
                    refreshError: connectionError,
                });
            });
            expect(wrapper).toMatchSnapshot();
        });
    });
});
