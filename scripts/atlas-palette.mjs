// Ocarina Atlas floor maps ship in a blue "blueprint" palette. The app recolors them to a
// parchment look (same shapes, so the marker positions still line up).
const palette = {
  '#0d1f2e': '#e9d9a6', // background (and the outline of the exit arrows)
  '#17344a': '#dcc98f', // grid lines
  '#1f5577': '#d8be6c', // ground
  '#8fd0ee': '#8c3f22', // outlines
  '#3f93c4': '#6e9fa6', // water
  '#e8f6ff': '#5b2a14', // exit arrows
  '#4f6475': '#8a7a5c', // stairs / walls
  '#2f6b4f': '#6f8f3a', // trees and grass
  '#a14f3a': '#a14f3a',
  '#08131c': '#3b2412',
};
export const restyle = svg => svg.replace(/#[0-9a-f]{6}\b/gi, color => palette[color.toLowerCase()] ?? color);
