import { RoomMember } from "matrix-js-sdk/src/models/room-member";
import { SDPStreamMetadataPurpose } from "matrix-js-sdk/src/webrtc/callEventTypes";
import { CallFeed } from "matrix-js-sdk/src/webrtc/callFeed";
import React, { ReactNode } from "react";
import { useCallFeed } from "../../../../hooks/useCallFeed";
import { useMediaStream } from "../../../../hooks/useMediaStream";
import { useRoomMemberName } from "../../../../hooks/useRoomMemberName";
import VideoTile from "./VideoTile";
import { IVideoGridItem } from "./VideoGrid";

interface IVideoTileContainerProps {
    item: IVideoGridItem<{ callFeed: CallFeed }>;
    getAvatar?: (member: RoomMember, width: number, height: number) => ReactNode;
    width: number;
    height: number;
}

export function VideoTileContainer({ item, width, height, getAvatar, ...rest }: IVideoTileContainerProps) {
    const {
        isLocal,
        audioMuted,
        videoMuted,
        speaking,
        stream,
        purpose,
        member,
    } = useCallFeed(item.callFeed);
    const name = useRoomMemberName(member);
    const mediaRef = useMediaStream<HTMLVideoElement>(stream, isLocal);

    // Firefox doesn't respect the disablePictureInPicture attribute
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1611831

    return (
        <VideoTile
            isLocal={isLocal}
            speaking={speaking}
            audioMuted={audioMuted}
            videoMuted={videoMuted}
            screenshare={purpose === SDPStreamMetadataPurpose.Screenshare}
            name={name}
            mediaRef={mediaRef}
            avatar={getAvatar && getAvatar(member, width, height)}
            {...rest}
        />
    );
}
