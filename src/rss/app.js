import axios from 'axios';
import _ from 'lodash';
import { string, setLocale } from 'yup';
import genirateFormWatcher from './watchers/formWatcher.js';
import genirateFeedsWatcher from './watchers/feedsWatcher.js';
import genirateUiStateWatcher from './watchers/uiWatcher.js';
import parseRss from './rssParser.js';

setLocale({
  mixed: {
    notOneOf: () => ({ key: 'rss_form.error_messages.already_exists' }),
    required: () => ({ key: 'rss_form.error_messages.field_required' }),
  },
  string: {
    url: () => ({ key: 'rss_form.error_messages.not_valid_url' }),
  },
});

const createRssSchema = (arr) => string().url().notOneOf(arr).required();

const downloadRssStream = (url, i18n) => axios
  .get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
  .then((response) => parseRss(response.data.contents))
  .catch((e) => {
    switch (e.code) {
      case 'ERR_NETWORK':
        throw new Error(i18n.t('rss_form.error_messages.network_error'));
      default:
        throw new Error(i18n.t('rss_form.error_messages.not_contain_valid_rss'));
    }
  });

const updateRssPosts = (feedsState, i18n) => {
  const { urls } = feedsState;
  if (urls.length === 0) {
    setTimeout(() => updateRssPosts(feedsState, i18n), 5000);
    return;
  }
  const promises = urls.map((url) => downloadRssStream(url, i18n).then((data) => data.posts));
  const promise = Promise.all(promises);
  promise.then((data) => {
    const newPosts = _.differenceBy(data.flat(), feedsState.posts, 'link');
    feedsState.posts = [...newPosts, ...feedsState.posts];
    setTimeout(() => updateRssPosts(feedsState, i18n), 5000);
  });
};

export default (state, i18n) => {
  const rssInput = document.querySelector('#rss-input');
  const feedback = document.querySelector('.feedback');
  const form = document.querySelector('.rss-form');
  const submitBtn = document.querySelector('form button');
  const feedsRoot = document.querySelector('.feeds');
  const postsRoot = document.querySelector('.posts');
  const modal = document.querySelector('#postModal');
  const elements = {
    rssInput,
    feedback,
    form,
    submitBtn,
    feedsRoot,
    postsRoot,
  };

  const uiState = genirateUiStateWatcher(state.uiState);
  const formState = genirateFormWatcher(state.formState, elements, i18n);
  const feedsState = genirateFeedsWatcher(state.feedsData, uiState, elements, i18n);

  if (modal) {
    modal.addEventListener('show.bs.modal', (e) => {
      const button = e.relatedTarget;
      const title = button.getAttribute('data-bs-title');
      const description = button.getAttribute('data-bs-description');
      const link = button.getAttribute('data-bs-link');
      const id = button.getAttribute('data-bs-id');

      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      const modalFooterLink = modal.querySelector('.modal-footer a');

      modalTitle.textContent = title;
      modalBody.textContent = description;
      modalFooterLink.href = link;

      uiState.checkedPosts.push(id);
    });
  }

  rssInput.addEventListener('change', (e) => {
    formState.processState = 'filling';
    formState.inputValue = e.target.value;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formState.processState = 'sending';
    const url = formState.inputValue;
    const schema = createRssSchema(feedsState.urls);

    schema.validate(url)
      .catch((res) => {
        const errorMessage = i18n.t(res.errors.map((err) => i18n.t(err.key)));
        formState.isValid = false;
        throw new Error(errorMessage);
      })
      .then(() => {
        formState.isValid = true;
        return downloadRssStream(url, i18n);
      })
      .then((data) => {
        feedsState.urls.unshift(url);
        feedsState.feeds.unshift(data.feed);
        feedsState.posts = [...data.posts, ...feedsState.posts];
        formState.errors = [];
        formState.processState = 'success';
        formState.inputValue = '';
      })
      .catch((error) => {
        formState.errors = error.message;
        formState.processState = 'failed';
      });
  });

  updateRssPosts(feedsState, i18n);
  rssInput.value = '';
  rssInput.focus();
};
