import onChange from 'on-change';

const handleProcess = (processState, errors, elements, i18n) => {
  const { rssInput, feedback, submitBtn } = elements;
  switch (processState) {
    case 'filling':
      break;
    case 'sending':
      submitBtn.disabled = true;
      break;
    case 'success':
      submitBtn.disabled = false;
      feedback.textContent = i18n.t('rss_form.success_message');
      feedback.classList.remove('text-danger');
      rssInput.value = '';
      rssInput.focus();
      break;
    case 'failed':
      submitBtn.disabled = false;
      feedback.textContent = errors;
      feedback.classList.add('text-danger');
      break;
    default:
      throw new Error('unexpected process state');
  }
};

const handleIsValid = (isValid, elements) => {
  const { rssInput } = elements;
  if (isValid) {
    rssInput.classList.remove('border', 'border-danger', 'is-invalid');
  } else {
    rssInput.classList.add('border', 'border-danger', 'is-invalid');
  }
};

const genirateFormWatcher = (formState, elements, i18n) => (
  onChange(formState, (path, value) => {
    switch (path) {
      case 'processState':
        handleProcess(value, formState.errors, elements, i18n);
        break;
      case 'isValid':
        handleIsValid(value, elements);
        break;
      default: break;
    }
  })
);

export default genirateFormWatcher;
