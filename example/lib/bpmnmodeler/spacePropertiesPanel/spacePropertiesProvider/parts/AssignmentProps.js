import { TextFieldEntry, isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

export function Assignment(props) {
    const { element, id } = props;
    const modeling = useService('modeling');
    const translate = useService('translate');
    const debounce = useService('debounceInput');

    const getValues = () => {
        const assignmentString = element.businessObject.assignment || '';
        return assignmentString.split(',').map(pair => {
            const [key, value] = pair.split('=').map(part => part.trim());
            return { key, value };
        });
    };

    const setValues = (updatedItems) => {
        const assignmentString = updatedItems.map(item => `${item.key}=${item.value}`).join(', ');
        modeling.updateProperties(element, { assignment: assignmentString });
    };

    const addAttribute = () => {
        const updatedItems = [...getValues(), { key: '', value: '' }];
        setValues(updatedItems);
    };

    const removeAttribute = (index) => {
        const updatedItems = getValues().filter((_, i) => i !== index);
        setValues(updatedItems);
    };

    return (
        <div>
            <div style={{ marginLeft: '12px', display: 'flex', justifyContent: 'left', alignItems: 'center', marginBottom: '1px' }}>
                <span style={{ marginRight: '8px' }}>
                    {translate('Add Assignment')}
                </span>
                <button
                    onClick={addAttribute}
                    style={{ background: 'white', color: 'black', border: '1px solid black', borderRadius: '3px', cursor: 'pointer', fontSize: '16px' }}>
                    +
                </button>
            </div>
            {getValues().map((item, index) => (
                < div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <TextFieldEntry
                        id={`${id}-key-${index}`}
                        element={element}
                        description={translate('ex."add"')}
                        label={`Attribute ${index + 1}`}
                        getValue={() => {
                            if (item.key === undefined || item.key === 'undefined')
                                return '';
                            return item.key
                        }}
                        setValue={(newKey) => {
                            const updatedItems = getValues();
                            updatedItems[index].key = newKey;
                            setValues(updatedItems);
                        }}
                        debounce={debounce}
                        style={{ flex: 1, marginRight: '1px' }}
                    />
                    <TextFieldEntry
                        id={`${id}-value-${index}`}
                        element={element}
                        description={translate('ex."p1.p2"')}
                        label={`Value ${index + 1}`}
                        getValue={() => {
                            if (item.value === undefined || item.value === 'undefined')
                                return '';
                            return item.value
                        }}
                        setValue={(newValue) => {
                            const updatedItems = getValues();
                            updatedItems[index].value = newValue;
                            setValues(updatedItems);
                        }}
                        debounce={debounce}
                        style={{ flex: 1, marginRight: '1px' }}
                    />
                    <button
                        onClick={() => removeAttribute(index)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginLeft: '1px'
                        }}>
                        Remove
                    </button>
                </div>
            ))}
        </div>
    );
}
