import React, { useCallback, memo, useRef, useEffect, useMemo } from "react";
import { GroupCall, GroupCallState, GroupCallType } from "matrix-js-sdk/src/webrtc/groupCall";
import { useGroupCall } from "../../../hooks/useGroupCall";
import VideoGrid, { useVideoGridLayout, IVideoGridItem } from "./GroupCallView/VideoGrid";
import CallViewButtons from "./CallView/CallViewButtons";
import AccessibleButton from "../elements/AccessibleButton";
import { _t } from "../../../languageHandler";
import { VideoTileContainer } from "./GroupCallView/VideoTileContainer";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";

interface IProps {
    groupCall: GroupCall;
    pipMode: boolean;
}

const GroupCallView = memo(({ groupCall, pipMode }: IProps) => {
    const callViewButtonsRef = useRef<CallViewButtons>();
    const {
        state,
        activeSpeaker,
        userMediaFeeds,
        microphoneMuted,
        localVideoMuted,
        screenshareFeeds,
        enter,
        leave,
        toggleLocalVideoMuted,
        toggleMicrophoneMuted,
    } = useGroupCall(groupCall);
    const [layout] = useVideoGridLayout(screenshareFeeds.length > 0);

    const items = useMemo<IVideoGridItem<{ callFeed: CallFeed }>[]>(() => userMediaFeeds.map((callFeed) => ({
        id: callFeed.userId,
        callFeed,
        focused: callFeed.userId === activeSpeaker,
        presenter: false,
    })), [userMediaFeeds, activeSpeaker]);

    useEffect(() => {
        (window as unknown as any).groupCall = groupCall;
    }, [groupCall]);

    const onMouseMove = useCallback(() => {
        callViewButtonsRef.current?.showControls();
    }, []);

    return (
        <div className="mx_GroupCallView" onMouseMove={onMouseMove}> {
            (state === GroupCallState.Entered || state === GroupCallState.Entering)
                ? <React.Fragment>
                    <VideoGrid items={items} layout={layout}>
                        { (props) => (
                            <VideoTileContainer
                                showName={items.length > 2 || props.item.focused}
                                key={props.item.id}
                                {...props}
                            />
                        ) }
                    </VideoGrid>
                    <CallViewButtons
                        ref={callViewButtonsRef}
                        pipMode={pipMode}
                        handlers={{
                            onHangupClick: leave,
                            onMicMuteClick: toggleMicrophoneMuted,
                            onVidMuteClick: toggleLocalVideoMuted,
                        }}
                        buttonsState={{
                            micMuted: microphoneMuted,
                            vidMuted: localVideoMuted,
                        }}
                        buttonsVisibility={{
                            vidMute: groupCall.type === GroupCallType.Video,
                        }}
                    />
                </React.Fragment>
                : <AccessibleButton kind="primary" onClick={enter}>
                    { _t("Enter conference ") }
                </AccessibleButton>
        } </div>
    );
});

export default GroupCallView;
