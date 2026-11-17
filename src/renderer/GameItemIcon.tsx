import type { TrackedItem } from '../shared/types';
import assets from './item-images.json';

const images: Record<string, { file: string }> = assets;

export function itemImage(id: string) {
  return images[id]?.file;
}

const groupIcons: Record<string, string> = { chests: 'chest', main_quests: 'master_sword', cow_rewards: 'lon_lon_milk', scarecrow_spots: 'scarecrows_song', bean_spots: 'magic_bean', big_poe_spots: 'big_poe' };

/** Game art for rows that have no image of their own, by full row id. */
const rowImages: Record<string, string> = {
  'minigames.shooting_child': 'fairy_slingshot', 'minigames.shooting_child_upgrade': 'bigger_deku_seed_bag',
  'minigames.shooting_adult': 'fairy_bow', 'minigames.shooting_adult_upgrade': 'bigger_quiver',
  'minigames.shooting_child_expert': 'fairy_slingshot', 'minigames.shooting_adult_expert': 'fairy_bow',
  'minigames.bowling_first': 'bombchus', 'minigames.bowling_second': 'bombchus', 'minigames.bowling_third': 'bombchus',
  'minigames.chest_game': 'chest', 'minigames.fishing_child': 'heart_piece', 'minigames.fishing_adult': 'golden_scale',
  'minigames.archery_750': 'fairy_bow', 'minigames.archery_1400': 'bigger_quiver',
  'minigames.dampe_dig': 'heart_piece', 'minigames.dampe_race': 'heart_piece', 'minigames.dampe_race_win': 'heart_piece',
  'minigames.diving': 'silver_scale', 'minigames.frogs_storm': 'song_of_storms', 'minigames.frogs_song': 'fairy_ocarina',
  'minigames.ingo_race': 'eponas_song', 'minigames.obstacle_course': 'eponas_song', 'minigames.lost_woods_target': 'business_scrub_seed',
  'minigames.theater_skull': 'skull_mask', 'minigames.theater_truth': 'mask_of_truth', 'minigames.super_cucco': 'pocket_cucco',
  'minigames.cucco_lady': 'wake_up_cucco', 'minigames.skull_kid': 'fairy_ocarina', 'minigames.running_man': 'bunny_hood',
  'side_events.light': 'light_medallion', 'side_events.escape': 'young_zelda', 'side_events.bottle_tutorial': 'bottle',
  'side_events.fire_arrow': 'fire_arrow', 'side_events.truth': 'lenses_of_truth', 'side_events.ice_arrow': 'ice_arrow',
  'side_events.poes': 'big_poe', 'side_events.skull_rewards': 'gold_skulltula', 'side_events.all_bosses': 'boss_key',
};

export function trackedItemIcon(item: TrackedItem) {
  const [group, itemId] = item.id.split('.');
  if (rowImages[item.id]) return rowImages[item.id];
  return images[itemId] ? itemId : groupIcons[group] ?? item.iconId;
}

export function GameItemIcon({ id, size = 24 }: { id?: string; size?: number }) {
  const file = id && itemImage(id);
  if (!file) return null;
  return <img className="game-item-icon" src={file} width={size} height={size} alt="" draggable={false} />;
}
