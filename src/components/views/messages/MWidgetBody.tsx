/*
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

import WidgetUtils from "../../../utils/WidgetUtils";
import * as React from 'react';
import * as sdk from "../../../index";
import AppTile from "../elements/AppTile";
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import {IApp} from "../../../stores/WidgetStore";

export default class MWidgetBody extends React.Component<any, any> {
    // static propTypes: {
    //     mxEvent: PropTypes.object.isRequired, // MatrixEvent
    //
    //     // Passthroughs for TextualBody
    //     highlights: PropTypes.array,
    //     highlightLink: PropTypes.string,
    //     showUrlPreview: PropTypes.bool,
    //     onHeightChanged: PropTypes.func,
    //     tileShape: PropTypes.string,
    // };

    renderAsText() {
        const TextualBody = sdk.getComponent("messages.TextualBody");
        return <TextualBody
            mxEvent={this.props.mxEvent}
            highlights={this.props.highlights}
            highlightLink={this.props.highlightLink}
            showUrlPreview={this.props.showUrlPreview}
            onHeightChanged={this.props.onHeightChanged}
            tileShapse={this.props.tileShape}
        />;
    }

    render() {
        const widgetInfo = this.props.mxEvent.getContent();

        let widgetUrl = widgetInfo['widget_url'];
        let wantedCapabilities = [];
        let showTitle = false;
        let strictFrame = false;
        if (!widgetUrl) {
            const widgetHtml = widgetInfo['widget_html'];
            if (!widgetHtml) return this.renderAsText();

            const info = WidgetUtils.wrapWidgetHtml(widgetHtml);
            widgetUrl = info.url;
            wantedCapabilities = info.wantedCapabilities;
            showTitle = true;
            strictFrame = true;
        }
        if (!widgetUrl) return this.renderAsText();

        const app: IApp = {
            ...widgetInfo,
            // XXX: Is this a secure enough widget ID?
            id: this.props.mxEvent.getRoomId() + "_" + this.props.mxEvent.getId(),
            url: widgetUrl,
        };

        return <div className="mx_MWidgetBody">
            <AppTile
                id={app.id}
                url={widgetUrl}
                name={widgetInfo['name'] || "Widget"}
                room={MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId())}
                type={widgetInfo['type'] || "m.custom"}
                app={app}
                fullWidth={true}
                userId={MatrixClientPeg.get().credentials.userId}
                creatorUserId={this.props.mxEvent.getSender()}
                waitForIframeLoad={true}
                show={true}
                showMenubar={showTitle}
                showTitle={showTitle}
                showMinimise={false}
                showDelete={false}
                showCancel={false}
                showPopout={false}
                widgetPageTitle={(widgetInfo['data'] && widgetInfo['data']['title']) ? widgetInfo['data']['title'] : null}
                handleMinimisePointerEvents={false}
                whitelistCapabilities={wantedCapabilities}
                strictSandbox={strictFrame}
            />
        </div>;
    };
}
