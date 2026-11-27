import streamDeck from "@elgato/streamdeck";
import { CharacterStatsAction } from "./actions/character-stats";
import { ShugoTimerAction } from "./actions/shugo-timer";

streamDeck.logger.setLevel("info");
streamDeck.actions.registerAction(new CharacterStatsAction());
streamDeck.actions.registerAction(new ShugoTimerAction());
streamDeck.connect();
