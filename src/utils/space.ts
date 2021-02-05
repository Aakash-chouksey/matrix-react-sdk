/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import {Room} from "matrix-js-sdk/src/models/room";
import {MatrixClient} from "matrix-js-sdk/src/client";
import {EventType} from "matrix-js-sdk/src/@types/event";

import {calculateRoomVia} from "../utils/permalinks/Permalinks";
import Modal from "../Modal";
import AddExistingToSpaceDialog from "../components/views/dialogs/AddExistingToSpaceDialog";
import CreateRoomDialog from "../components/views/dialogs/CreateRoomDialog";
import createRoom, {IOpts} from "../createRoom";

export const shouldShowSpaceSettings = (cli: MatrixClient, space: Room) => {
    const userId = cli.getUserId();
    return space.getMyMembership() === "join"
        && (space.currentState.maySendStateEvent(EventType.RoomAvatar, userId)
            || space.currentState.maySendStateEvent(EventType.RoomName, userId)
            || space.currentState.maySendStateEvent(EventType.RoomTopic, userId)
            || space.currentState.maySendStateEvent(EventType.RoomJoinRules, userId));
}

export const showAddExistingRooms = (cli: MatrixClient, space: Room) => {
    Modal.createTrackedDialog(
        "Space Landing",
        "Add Existing",
        AddExistingToSpaceDialog,
        {
            matrixClient: cli,
            onCreateRoomClick: showCreateNewRoom,
            space,
        },
        "mx_AddExistingToSpaceDialog_wrapper",
    );
};

export const showCreateNewRoom = async (cli: MatrixClient, space: Room) => {
    // TODO add copy to say "... in this space"
    const modal = Modal.createTrackedDialog<[boolean, IOpts]>(
        "Space Landing",
        "Create Room",
        CreateRoomDialog,
        {
            defaultPublic: space.getJoinRule() === "public",
            parentSpace: space,
        },
    );
    const [shouldCreate, opts] = await modal.finished;
    if (shouldCreate) {
        createRoom(opts);
    }
};

export const makeSpaceParentEvent = (room: Room, isDefault = false) => ({
    type: EventType.SpaceParent,
    content: {
        "room_id": room.roomId,
        "via": calculateRoomVia(room),
        "default": isDefault,
    },
});
