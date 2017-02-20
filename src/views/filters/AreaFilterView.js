import $ from 'jquery';
import Backbone from 'backbone';
import Marionette from 'backbone.marionette';
import shp from 'shpjs';
import i18next from 'i18next';

import template from './AreaFilterView.hbs';
import FeatureListView from './FeatureListView';
import { readFileAsArraybuffer } from '../../utils';

const AreaFilterView = Marionette.LayoutView.extend({
  template,
  className: 'panel panel-default',
  events: {
    'change .show-point input': 'onPointInputChange',
    'change .show-bbox input': 'onBBoxInputChange',
    'click .tool-point': 'onToolPointClicked',
    'click .tool-bbox': 'onToolBBoxClicked',
    'click .tool-polygon': 'onToolPolygonClicked',
    'click .tool-clear': 'onToolClearClicked',
    'click .tool-show-feature': 'onToolShowFeatureClicked',
    'change :file': 'onFileChanged',
  },

  regions: {
    featureList: '.feature-list',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.highlightModel = options.highlightModel;
    this.filtersModel = options.filtersModel;
    this.featureListCollection = new Backbone.Collection();

    this.listenTo(this.filtersModel, 'change:area', this.onFiltersAreaChanged);
    this.listenTo(this.mapModel, 'change:tool', this.onMapToolChanged);
    this.listenTo(this.mapModel, 'change:bbox', this.onMapBBOXChanged);
  },

  // Marionette event listeners

  onBeforeShow() {
    this.showChildView('featureList', new FeatureListView({
      mapModel: this.mapModel,
      highlightModel: this.highlightModel,
      filtersModel: this.filtersModel,
      collection: this.featureListCollection,
    }));
  },

  // DOM event listeners

  onPointInputChange() {
    const coordinates = this.$('.show-point input[type=number]')
      .map((index, elem) => $(elem).val())
      .get()
      .map(parseFloat);

    if (coordinates.reduce((prev, current) => prev && !isNaN(current), true)) {
      this.filtersModel.set('area', {
        geometry: { type: 'Point', coordinates },
        type: 'Feature',
      });
    }
  },

  onBBoxInputChange() {
    const bbox = this.$('.show-bbox input[type=number]')
      .map((index, elem) => $(elem).val())
      .get()
      .map(parseFloat);

    if (bbox.reduce((prev, current) => prev && !isNaN(current), true)) {
      this.filtersModel.set('area', bbox);
    }
  },

  onToolPointClicked() {
    this.mapModel.set('tool', 'point');
  },

  onToolBBoxClicked() {
    this.mapModel.set('tool', 'bbox');
  },

  onToolPolygonClicked() {
    this.mapModel.set('tool', 'polygon');
  },

  onToolClearClicked(event) {
    event.preventDefault();
    this.mapModel.set('tool', null);
    this.filtersModel.set('area', null);
  },

  onToolShowFeatureClicked(event) {
    event.preventDefault();
    const area = this.filtersModel.get('area');
    this.mapModel.show(area);
  },

  onFileChanged(event) {
    const $input = $(event.target).parents('.input-group').find(':text');
    if (event.currentTarget.files && event.currentTarget.files.length) {
      const name = event.currentTarget.files[0].name;
      $input.val(name);

      readFileAsArraybuffer(event.currentTarget.files[0])
        .then(data => shp(data))
        .then((features) => {
          this.featureListCollection.reset(features.features);
          this.$('.select-feature').prop('disabled', false);
          this.$('.panel-features').fadeIn('fast');
        });
    } else {
      $input.val('');
    }
  },

  // model event listeners

  onFiltersAreaChanged(filtersModel) {
    const area = filtersModel.get('area');

    this.$('.show-geometry').hide();
    if (Array.isArray(area) && area.length === 4) {
      this.$('.show-bbox input[type=number]:eq(0)').val(area[0]);
      this.$('.show-bbox input[type=number]:eq(1)').val(area[1]);
      this.$('.show-bbox input[type=number]:eq(2)').val(area[2]);
      this.$('.show-bbox input[type=number]:eq(3)').val(area[3]);
      this.$('.show-bbox').show();
    } else if (area && area.geometry && area.geometry.type === 'Point') {
      this.$('.show-point input[type=number]:eq(0)').val(area.geometry.coordinates[0]);
      this.$('.show-point input[type=number]:eq(1)').val(area.geometry.coordinates[1]);
      this.$('.show-point').show();
    } else if (area && area.geometry) {
      let name = i18next.t('Drawn Shape');
      if (area.properties) {
        const keys = ['name', 'NAME']; // TODO: more
        for (let i = 0; i < keys.length; ++i) {
          if (area.properties.hasOwnProperty(keys[i])) {
            name = area.properties[keys[i]];
            break;
          }
        }
      }
      this.$('.show-polygon input[type=text]').val(name);
      this.$('.show-polygon').show();
    }

    if (area) {
      this.$('#selection-wrapper').show();
      this.$('#map-bbox-wrapper').hide();
    } else {
      this.$('#selection-wrapper').hide();
      this.$('#map-bbox-wrapper').show();
    }
  },

  onMapToolChanged(mapModel, tool) {
    this.$('.tool').removeClass('active');
    if (tool) {
      this.$(`.tool-${tool}`).addClass('active');
    }
  },

  onMapBBOXChanged() {
    const bbox = this.mapModel.get('bbox');
    this.$('#map-bbox-wrapper input:eq(0)').val(bbox[0].toFixed(2));
    this.$('#map-bbox-wrapper input:eq(1)').val(bbox[1].toFixed(2));
    this.$('#map-bbox-wrapper input:eq(2)').val(bbox[2].toFixed(2));
    this.$('#map-bbox-wrapper input:eq(3)').val(bbox[3].toFixed(2));
  },
});

export default AreaFilterView;