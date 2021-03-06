/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Effects, Task} from "reflex";
import {merge, always} from "../../common/prelude";
import {cursor} from "../../common/cursor";
import {ok, error} from "../../common/result";
import * as Focusable from "../../common/focusable";


/*::
import type {Result} from "../../common/result"
import type {Never} from "reflex"
import type {ID, Float, Model, Action} from "./shell"
*/


export const MakeVisible/*:Action*/ =
  ({type: "MakeVisible"});

export const MakeNotVisible/*:Action*/ =
  ({type: "MakeNotVisible"});

export const ZoomIn/*:Action*/ =
  ({type: "ZoomIn"});

export const ZoomOut/*:Action*/ =
  ({type: "ZoomOut"});

export const ResetZoom/*:Action*/ =
  ({type: "ResetZoom"});

const FocusableAction =
  action =>
  ({type: "Focusable", action});

export const Focus/*:Action*/ = Focusable.Focus;
export const Blur/*:Action*/ = Focusable.Blur;

const NoOp = always({type: "NoOp"});

const VisibilityChanged =
  result =>
  ({type: "VisibilityChanged", visibilityResult: result});

const ZoomChanged =
  result =>
  ({type: "ZoomChanged", zoomResult: result});

const setZoom = (id, level) =>
  Task.future(() => {
    const target = document.getElementById(`web-view-${id}`);
    const result
      = target == null
      ? error(Error(`WebView with id web-view-${id} not found`))
      : typeof(target.zoom) !== 'function'
      ? error(Error(`.zoom is not supported by runtime`))
      : ok(level);

    if (result.isOk) {
      // @FlowIssue: Flow can't infer enough to tell it's function here.
      target.zoom(level)
    }

    return Promise.resolve(result)
  });

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

export const zoomIn =
  (id/*:ID*/, zoom/*:number*/)/*:Task<Never, Result<Error, Float>>*/ =>
  setZoom(id, Math.min(ZOOM_MAX, zoom + ZOOM_STEP));

export const zoomOut =
  (id/*:ID*/, zoom/*:number*/)/*:Task<Never, Result<Error, Float>>*/ =>
  setZoom(id, Math.max(ZOOM_MIN, zoom - ZOOM_STEP));

export const resetZoom =
  (id/*:ID*/)/*:Task<Never, Result<Error, Float>>*/ =>
  setZoom(id, 1);

export const setVisibility =
  (id/*:ID*/, isVisible/*:boolean*/)/*:Task<Never, Result<Error, boolean>>*/ =>
  Task.future(() => {
    const target = document.getElementById(`web-view-${id}`);
    const result
      = target == null
      ? error(Error(`WebView with id web-view-${id} not found`))
      : typeof(target.setVisible) !== 'function'
      ? error(Error(`.setVisible is not supported by runtime`))
      : ok(isVisible);

    if (result.isOk) {
      // @FlowIssue: Flow can't infer enough to tell it's function here.
      target.setVisible(isVisible);
    }

    return Promise.resolve(result);
  });

// Reports error as a warning in a console.
const report =
  error =>
  new Task((succeed, fail) => {
    console.warn(error);
  });


const updateFocus = Focusable.update;

export const init =
  (id/*:ID*/, isFocused/*:boolean*/)/*:[Model, Effects<Action>]*/ =>
  [ {id, isFocused: isFocused, isVisible: false, zoom: 1}
  , ( isFocused
    ? Effects.receive(Focus)
    : Effects.none
    )
  ];

export const update =
  (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ =>
  ( action.type === 'ZoomIn'
  ? [ model
    , Effects
        .task(zoomIn(model.id, model.zoom))
        .map(ZoomChanged)
    ]
  : action.type === 'ZoomOut'
  ? [ model
    , Effects
        .task(zoomOut(model.id, model.zoom))
        .map(ZoomChanged)
    ]
  : action.type === 'ResetZoom'
  ? [ model
    , Effects
        .task(resetZoom(model.id))
        .map(ZoomChanged)
    ]
  : action.type === 'MakeVisible'
  ? [ model
    , Effects
        .task(setVisibility(model.id, true))
        .map(VisibilityChanged)
    ]
  : action.type === 'MakeNotVisible'
  ? [ model
    , Effects
        .task(setVisibility(model.id, false))
        .map(VisibilityChanged)
    ]
  : action.type === 'VisibilityChanged'
  ? ( action.visibilityResult.isOk
    ? [ merge(model, {isVisible: action.visibilityResult.value})
      , Effects.none
      ]
    : [ model
      , Effects
        .task(report(action.visibilityResult.error))
        .map(NoOp)
      ]
    )
  : action.type === 'ZoomChanged'
  ?  ( action.zoomResult.isOk
    ? [ merge(model, {zoom: action.zoomResult.value}), Effects.none ]
    : [ model
      , Effects
        .task(report(action.zoomResult.error))
        .map(NoOp)
      ]
    )

  // Delegate
  : action.type === 'Focus'
  ? updateFocus(model, action)
  : action.type === 'Blur'
  ? updateFocus(model, action)

  : [model, Effects.none]
  );
