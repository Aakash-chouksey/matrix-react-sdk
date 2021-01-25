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

import React, {RefObject, useContext, useRef, useState} from "react";
import {EventType} from "matrix-js-sdk/src/@types/event";
import {Room} from "matrix-js-sdk/src/models/room";

import MatrixClientContext from "../../contexts/MatrixClientContext";
import RoomAvatar from "../views/avatars/RoomAvatar";
import {_t} from "../../languageHandler";
import AccessibleButton from "../views/elements/AccessibleButton";
import RoomName from "../views/elements/RoomName";
import RoomTopic from "../views/elements/RoomTopic";
import FormButton from "../views/elements/FormButton";
import {inviteMultipleToRoom, showSpaceInviteDialog} from "../../RoomInvite";
import {useRoomMembers} from "../../hooks/useRoomMembers";
import createRoom, {IOpts, Preset} from "../../createRoom";
import Field from "../views/elements/Field";
import {useEventEmitter} from "../../hooks/useEventEmitter";
import StyledRadioGroup from "../views/elements/StyledRadioGroup";
import withValidation from "../views/elements/Validation";
import * as Email from "../../email";
import defaultDispatcher from "../../dispatcher/dispatcher";
import {OpenSpaceSettingsPayload} from "../../dispatcher/payloads/OpenSpaceSettingsPayload";
import {Action} from "../../dispatcher/actions";
import ResizeNotifier from "../../utils/ResizeNotifier"
import MainSplit from './MainSplit';
import ErrorBoundary from "../views/elements/ErrorBoundary";
import {ActionPayload} from "../../dispatcher/payloads";
import RightPanel from "./RightPanel";
import RightPanelStore from "../../stores/RightPanelStore";
import {EventSubscription} from "fbemitter";
import {RightPanelPhases} from "../../stores/RightPanelStorePhases";
import {SetRightPanelPhasePayload} from "../../dispatcher/payloads/SetRightPanelPhasePayload";
import {useStateArray} from "../../hooks/useStateArray";
import SpacePublicShare from "../views/spaces/SpacePublicShare";
import {showAddExistingRooms, showCreateNewRoom, shouldShowSpaceSettings} from "../../utils/space";

interface IProps {
    space: Room;
    justCreatedOpts?: IOpts;
    resizeNotifier: ResizeNotifier;
    onJoinButtonClicked(): void;
    onRejectButtonClicked(): void;
}

interface IState {
    phase: Phase;
    showRightPanel: boolean;
    rightPanelPhase?: RightPanelPhase;
    rightPanelArgs?: any;
}

enum Phase {
    Landing,
    PublicCreateRooms,
    PublicShare,
    PrivateScope,
    PrivateInvite,
    PrivateCreateRooms,
    PrivateExistingRooms,
}

enum RightPanelPhase {
    MemberList,
    MemberInfo,
}

const RoomMemberCount = ({ room, children }) => {
    const members = useRoomMembers(room);
    const count = members.length;

    if (children) return children(count);
    return count;
};

const useMyRoomMembership = (room: Room) => {
    const [membership, setMembership] = useState(room.getMyMembership());
    useEventEmitter(room, "Room.myMembership", () => {
        setMembership(room.getMyMembership());
    });
    return membership;
};

const SpaceLanding = ({ space, onJoinButtonClicked, onRejectButtonClicked }) => {
    const cli = useContext(MatrixClientContext);
    const myMembership = useMyRoomMembership(space);
    const joinRule = space.getJoinRule();

    let joinButtons;
    if (myMembership === "invite") {
        joinButtons = <div className="mx_SpaceRoomView_landing_joinButtons">
            <FormButton label={_t("Accept Invite")} onClick={onJoinButtonClicked} />
            <AccessibleButton kind="link" onClick={onRejectButtonClicked}>
                {_t("Decline")}
            </AccessibleButton>
        </div>;
    } else if (myMembership !== "join" && joinRule === "public") {
        joinButtons = <div className="mx_SpaceRoomView_landing_joinButtons">
            <FormButton label={_t("Join")} onClick={onJoinButtonClicked} />
        </div>;
    }

    const userId = cli.getUserId();

    let inviteButton;
    if (myMembership === "join" && space.canInvite(userId)) {
        inviteButton = (
            <AccessibleButton className="mx_SpaceRoomView_landing_inviteButton" onClick={() => {
                showSpaceInviteDialog(space.roomId);
            }}>
                { _t("Invite people") }
            </AccessibleButton>
        );
    }

    const canAddRooms = myMembership === "join" && space.currentState.maySendStateEvent(EventType.SpaceChild, userId);

    let addRoomButtons;
    if (canAddRooms) {
        addRoomButtons = <React.Fragment>
            <AccessibleButton className="mx_SpaceRoomView_landing_addButton" onClick={() => {
                showAddExistingRooms(cli, space);
            }}>
                { _t("Add existing rooms & spaces") }
            </AccessibleButton>
            <AccessibleButton className="mx_SpaceRoomView_landing_createButton" onClick={() => {
                showCreateNewRoom(cli, space);
            }}>
                { _t("Create a new room") }
            </AccessibleButton>
        </React.Fragment>;
    }

    let settingsButton;
    if (shouldShowSpaceSettings(cli, space)) {
        settingsButton = <AccessibleButton className="mx_SpaceRoomView_landing_settingsButton" onClick={() => {
            defaultDispatcher.dispatch<OpenSpaceSettingsPayload>({
                action: Action.OpenSpaceSettings,
                space,
            });
        }}>
            { _t("Settings") }
        </AccessibleButton>;
    }

    return <div className="mx_SpaceRoomView_landing">
        <RoomAvatar room={space} height={80} width={80} viewAvatarOnClick={true} />
        <div className="mx_SpaceRoomView_landing_name">
            <RoomName room={space}>
                {(name) => {
                    const tags = { name: () => <h1>{ name }</h1> };
                    if (myMembership === "invite") {
                        return _t("You have been invited to <name/>", {}, tags) as JSX.Element;
                    }
                    return _t("Welcome to <name/>", {}, tags) as JSX.Element;
                }}
            </RoomName>
            <RoomMemberCount room={space}>
                {(count) => (
                    <AccessibleButton
                        className="mx_SpaceRoomView_landing_memberCount"
                        kind="link"
                        onClick={() => {
                            defaultDispatcher.dispatch<SetRightPanelPhasePayload>({
                                action: Action.SetRightPanelPhase,
                                phase: RightPanelPhases.RoomMemberList,
                                refireParams: { space },
                            });
                        }}
                    >
                        { _t("%(count)s members", { count }) }
                    </AccessibleButton>
                )}
            </RoomMemberCount>
        </div>
        <div className="mx_SpaceRoomView_landing_topic">
            <RoomTopic room={space} />
        </div>
        { joinButtons }
        <div className="mx_SpaceRoomView_landing_adminButtons">
            { inviteButton }
            { addRoomButtons }
            { settingsButton }
        </div>
    </div>;
};

const SpaceSetupFirstRooms = ({ space, title, description, onFinished }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const numFields = 3;
    const placeholders = [_t("#general"), _t("#random"), _t("#support")];
    const [roomNames, setRoomName] = useStateArray("", numFields);
    const fields = new Array(numFields).fill(0).map((_, i) => {
        const name = "roomName" + i;
        return <Field
            key={name}
            name={name}
            type="text"
            label={_t("Room name")}
            placeholder={placeholders[i]}
            value={roomNames[i]}
            onChange={ev => setRoomName(i, ev.target.value)}
        />;
    });

    const onNextClick = async () => {
        setError("");
        setBusy(true);
        try {
            await Promise.all(roomNames.map(name => name.trim()).filter(Boolean).map(name => {
                return createRoom({
                    createOpts: {
                        preset: space.getJoinRule() === "public" ? Preset.PublicChat : Preset.PrivateChat,
                        name,
                    },
                    spinner: false,
                    encryption: false,
                    andView: false,
                    inlineErrors: true,
                    parentSpace: space,
                });
            }));
            onFinished();
        } catch (e) {
            console.error("Failed to create initial space rooms", e);
            setError(_t("Failed to create initial space rooms"));
        }
        setBusy(false);
    };

    return <div>
        <h1>{ title }</h1>
        <div className="mx_SpaceRoomView_description">{ description }</div>

        { error && <div className="mx_SpaceRoomView_errorText">{ error }</div> }
        { fields }

        <div className="mx_SpaceRoomView_buttons">
            <AccessibleButton onClick={onFinished} kind="link">{_t("Skip for now")}</AccessibleButton>
            <FormButton
                label={busy ? _t("Creating rooms...") : _t("Next")}
                disabled={busy}
                onClick={onNextClick}
            />
        </div>
    </div>;
};

const SpaceSetupPublicShare = ({ space, onFinished }) => {
    return <div className="mx_SpaceRoomView_publicShare">
        <h1>{ _t("Share your public space") }</h1>
        <div className="mx_SpacePublicShare_description">{ _t("At the moment only you can see it.") }</div>

        <SpacePublicShare space={space} onFinished={onFinished} />

        <div className="mx_SpaceRoomView_buttons">
            <FormButton label={_t("Finish")} onClick={onFinished} />
        </div>
    </div>;
};

const SpaceSetupPrivateScope = ({ onFinished }) => {
    const [option, setOption] = useState<string>(null);

    return <div className="mx_SpaceRoomView_privateScope">
        <h1>{ _t("Who are you working with?") }</h1>
        <div className="mx_SpaceRoomView_description">{ _t("Ensure the right people have access to the space.") }</div>

        <StyledRadioGroup
            name="privateSpaceScope"
            value={option}
            onChange={setOption}
            definitions={[
                {
                    value: "justMe",
                    className: "mx_SpaceRoomView_privateScope_justMeButton",
                    label: <React.Fragment>
                        <h3>{ _t("Just Me") }</h3>
                        <div>{ _t("A private space just for you") }</div>
                    </React.Fragment>,
                }, {
                    value: "meAndMyTeammates",
                    className: "mx_SpaceRoomView_privateScope_meAndMyTeammatesButton",
                    label: <React.Fragment>
                        <h3>{ _t("Me and my teammates") }</h3>
                        <div>{ _t("A private space for you and your teammates") }</div>
                    </React.Fragment>,
                },
            ]}
        />

        <div className="mx_SpaceRoomView_buttons">
            <FormButton label={_t("Next")} disabled={!option} onClick={() => onFinished(option !== "justMe")} />
        </div>
    </div>;
};

const validateEmailRules = withValidation({
    rules: [{
        key: "email",
        test: ({ value }) => !value || Email.looksValid(value),
        invalid: () => _t("Doesn't look like a valid email address"),
    }],
});

const SpaceSetupPrivateInvite = ({ space, onFinished }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const numFields = 3;
    const fieldRefs: RefObject<Field>[] = [useRef(), useRef(), useRef()];
    const [emailAddresses, setEmailAddress] = useStateArray("", numFields);
    const fields = new Array(numFields).fill(0).map((_, i) => {
        const name = "emailAddress" + i;
        return <Field
            key={name}
            name={name}
            type="text"
            label={_t("Email address")}
            placeholder={_t("Email")}
            value={emailAddresses[i]}
            onChange={ev => setEmailAddress(i, ev.target.value)}
            ref={fieldRefs[i]}
            onValidate={validateEmailRules}
        />;
    });

    const onNextClick = async () => {
        setError("");
        for (let i = 0; i < fieldRefs.length; i++) {
            const fieldRef = fieldRefs[i];
            const valid = await fieldRef.current.validate({ allowEmpty: true });

            if (valid === false) { // true/null are allowed
                fieldRef.current.focus();
                fieldRef.current.validate({ allowEmpty: true, focused: true });
                return;
            }
        }

        setBusy(true);
        const targetIds = emailAddresses.map(name => name.trim()).filter(Boolean);
        try {
            const result = await inviteMultipleToRoom(space.roomId, targetIds);

            const failedUsers = Object.keys(result.states).filter(a => result.states[a] === "error");
            if (failedUsers.length > 0) {
                console.log("Failed to invite users to space: ", result);
                setError(_t("Failed to invite the following users to your space: %(csvUsers)s", {
                    csvUsers: failedUsers.join(", "),
                }));
            } else {
                onFinished();
            }
        } catch (err) {
            console.error("Failed to invite users to space: ", err);
            setError(_t("We couldn't invite those users. Please check the users you want to invite and try again."));
        }
        setBusy(false);
    };

    return <div className="mx_SpaceRoomView_inviteTeammates">
        <h1>{ _t("Invite your teammates") }</h1>
        <div className="mx_SpaceRoomView_description">{ _t("Ensure the right people have access to the space.") }</div>

        { error && <div className="mx_SpaceRoomView_errorText">{ error }</div> }
        { fields }

        <div className="mx_SpaceRoomView_inviteTeammates_buttons">
            <AccessibleButton
                className="mx_SpaceRoomView_inviteTeammates_inviteDialogButton"
                onClick={() => showSpaceInviteDialog(space.roomId)}
            >
                { _t("Invite by username") }
            </AccessibleButton>
        </div>

        <div className="mx_SpaceRoomView_buttons">
            <AccessibleButton onClick={onFinished} kind="link">{_t("Skip for now")}</AccessibleButton>
            <FormButton label={busy ? _t("Inviting...") : _t("Next")} disabled={busy} onClick={onNextClick} />
        </div>
    </div>;
};

export default class SpaceRoomView extends React.PureComponent<IProps, IState> {
    static contextType = MatrixClientContext;

    private readonly creator: string;
    private readonly dispatcherRef: string;
    private readonly rightPanelStoreToken: EventSubscription;

    constructor(props, context) {
        super(props, context);

        let phase = Phase.Landing;

        this.creator = this.props.space.currentState.getStateEvents(EventType.RoomCreate, "")?.getSender();
        const showSetup = this.props.justCreatedOpts && this.context.getUserId() === this.creator;

        if (showSetup) {
            phase = this.props.justCreatedOpts.createOpts.preset === Preset.PublicChat
                ? Phase.PublicCreateRooms : Phase.PrivateScope;
        }

        this.state = {
            phase,
            showRightPanel: RightPanelStore.getSharedInstance().isOpenForRoom,
            rightPanelPhase: null,
            rightPanelArgs: null,
        };

        this.dispatcherRef = defaultDispatcher.register(this.onAction);
        this.rightPanelStoreToken = RightPanelStore.getSharedInstance().addListener(this.onRightPanelStoreUpdate);
    }

    componentWillUnmount() {
        defaultDispatcher.unregister(this.dispatcherRef);
        this.rightPanelStoreToken.remove();
    }

    private onRightPanelStoreUpdate = () => {
        this.setState({
            showRightPanel: RightPanelStore.getSharedInstance().isOpenForRoom,
        });
    };

    private onAction = (payload: ActionPayload) => {
        if (payload.action !== Action.ViewUser && payload.action !== "view_3pid_invite") return;

        if (payload.action === Action.ViewUser && payload.member) {
            defaultDispatcher.dispatch<SetRightPanelPhasePayload>({
                action: Action.SetRightPanelPhase,
                phase: RightPanelPhases.SpaceMemberInfo,
                refireParams: {
                    space: this.props.space,
                    member: payload.member,
                },
            });
        } else if (payload.action === "view_3pid_invite" && payload.event) {
            defaultDispatcher.dispatch<SetRightPanelPhasePayload>({
                action: Action.SetRightPanelPhase,
                phase: RightPanelPhases.Space3pidMemberInfo,
                refireParams: {
                    space: this.props.space,
                    event: payload.event,
                },
            });
        } else {
            defaultDispatcher.dispatch<SetRightPanelPhasePayload>({
                action: Action.SetRightPanelPhase,
                phase: RightPanelPhases.SpaceMemberList,
                refireParams: { space: this.props.space },
            });
        }
    };

    private renderBody() {
        switch (this.state.phase) {
            case Phase.Landing:
                return <SpaceLanding
                    space={this.props.space}
                    onJoinButtonClicked={this.props.onJoinButtonClicked}
                    onRejectButtonClicked={this.props.onRejectButtonClicked}
                />;

            case Phase.PublicCreateRooms:
                return <SpaceSetupFirstRooms
                    space={this.props.space}
                    title={_t("What discussions do you want to have?")}
                    description={_t("We'll create rooms for each topic.")}
                    onFinished={() => this.setState({ phase: Phase.PublicShare })}
                />;
            case Phase.PublicShare:
                return <SpaceSetupPublicShare
                    space={this.props.space}
                    onFinished={() => this.setState({ phase: Phase.Landing })}
                />;

            case Phase.PrivateScope:
                return <SpaceSetupPrivateScope
                    onFinished={(invite: boolean) => {
                        this.setState({ phase: invite ? Phase.PrivateInvite : Phase.PrivateCreateRooms });
                    }}
                />;
            case Phase.PrivateInvite:
                return <SpaceSetupPrivateInvite
                    space={this.props.space}
                    onFinished={() => this.setState({ phase: Phase.PrivateCreateRooms })}
                />;
            case Phase.PrivateCreateRooms:
                return <SpaceSetupFirstRooms
                    space={this.props.space}
                    title={_t("What projects are you working on?")}
                    description={_t("We'll create rooms for each of them. You can add existing rooms after setup.")}
                    onFinished={() => this.setState({ phase: Phase.Landing })}
                />;
        }
    }

    render() {
        const rightPanel = this.state.showRightPanel && this.state.phase === Phase.Landing
            ? <RightPanel room={this.props.space} resizeNotifier={this.props.resizeNotifier} />
            : null;

        return <main className="mx_SpaceRoomView">
            <ErrorBoundary>
                <MainSplit panel={rightPanel} resizeNotifier={this.props.resizeNotifier}>
                    { this.renderBody() }
                </MainSplit>
            </ErrorBoundary>
        </main>;
    }
}
