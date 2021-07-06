/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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
import { Room } from "matrix-js-sdk/src/models/room";
import classNames from "classnames";

import AccessibleButton from "../../views/elements/AccessibleButton";
import ActiveRoomObserver from "../../../ActiveRoomObserver";
import DecoratedRoomAvatar from "../avatars/DecoratedRoomAvatar";
import dis from '../../../dispatcher/dispatcher';
import { Key } from "../../../Keyboard";

interface IProps {
    room: Room;
}

interface IState {
    selected: boolean;
    messagePreview?: string;
}

export default class UserInfoRoomTile extends React.PureComponent<IProps, IState> {
    constructor(props: IProps) {
        super(props);

        this.state = {
            selected: ActiveRoomObserver.activeRoomId === this.props.room.roomId,
        };
    }

    private onTileClick = (ev: React.KeyboardEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        dis.dispatch({
            action: 'view_room',
            show_room_tile: true, // make sure the room is visible in the list
            room_id: this.props.room.roomId,
            clear_search: (ev && (ev.key === Key.ENTER || ev.key === Key.SPACE)),
        });
    };

    public render(): React.ReactElement {
        const classes = classNames("mx_RoomTile", {
            "mx_RoomTile_selected": this.state.selected,
        });

        const roomAvatar = <DecoratedRoomAvatar room={this.props.room} avatarSize={32} displayBadge={false} />;

        const name = this.props.room.name;
        const nameContainer = (
            <div className="mx_RoomTile_nameContainer">
                <div title={name} className={"mx_RoomTile_name"} tabIndex={-1} dir="auto">
                    {name}
                </div>
            </div>
        );

        return (
            <AccessibleButton
                className={classes}
                onClick={this.onTileClick}
                role="treeitem"
                aria-label={name}
                aria-selected={this.state.selected}
            >
                { roomAvatar }
                { nameContainer }
            </AccessibleButton>
        );
    }
}
