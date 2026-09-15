/** Original Blender models keyed by the existing, saved evolution identifiers. */
export const EVOLUTION_MODELS=Object.freeze({
 torpedo:Object.freeze({swarm:'evolution-torpedo-swarm',split:'evolution-torpedo-split'}),
 arc:Object.freeze({web:'evolution-arc-web',thunder:'evolution-arc-thunder'}),
 harpoon:Object.freeze({trident:'evolution-harpoon-trident',whale:'evolution-harpoon-whale'})
});
export const CROWN_MODELS=Object.freeze({nautilus:'crown-nautilus',bastion:'crown-bastion',wraith:'crown-wraith'});
export const ARMORY_ASSETS=Object.freeze([...Object.values(EVOLUTION_MODELS).flatMap(Object.values),...Object.values(CROWN_MODELS)]);
export const weaponModel=(key,evolution)=>EVOLUTION_MODELS[key]?.[evolution]||'module-'+key;
