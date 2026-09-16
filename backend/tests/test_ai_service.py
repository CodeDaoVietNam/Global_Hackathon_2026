import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def reference_mode(monkeypatch):
    monkeypatch.setenv('AI_PROVIDER', 'reference')

@pytest.mark.parametrize('situation,card', [
    ('Need to submit tonight meh?', 'sg-team-03'),
    ('Want to makan after class?', 'sg-team-04'),
    ('Another 8 am meeting. Shiok.', 'sg-humour-02'),
    ('They imitated my accent and said just joking.', 'sg-humour-04'),
    ('This claim is not supported by our data.', 'sg-feedback-04'),
])
def test_retrieval(situation, card):
    response = client.post('/api/v1/analyze', json={'situation': situation})
    assert response.status_code == 200
    assert response.json()['cards'][0]['id'] == card


def test_explicit_gemini_without_key_is_not_silent_mock(monkeypatch):
    monkeypatch.setenv('AI_PROVIDER', 'gemini')
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    r = client.post('/api/v1/analyze', json={'situation': 'My teammate said bojio.'})
    assert r.status_code == 503
    assert 'key' not in r.text.lower() or 'configured' in r.text.lower()


def test_gemini_receives_context_and_validates_citations(monkeypatch):
    import json
    import httpx
    monkeypatch.setenv('AI_PROVIDER', 'gemini')
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only')
    seen = []
    def send(url, **kwargs):
        seen.append(kwargs['json'])
        content = {'summary': 'They explicitly said they felt excluded.',
                   'possible_meanings': ['Take their stated feeling seriously.'],
                   'do_not_assume': ['Do not insist it was only a joke.'],
                   'clarifying_questions': [],
                   'next_action': 'Ask whether they would like an invitation next time.',
                   'learning_prompt': 'Write an inclusive response.',
                   'card_ids': ['sg-humour-01']}
        return httpx.Response(200, json={'candidates':[{'content':{'parts':[{'text':json.dumps(content)}]}}]}, request=httpx.Request('POST',url))
    monkeypatch.setattr('app.services.ai_service.httpx.post', send)
    r = client.post('/api/v1/analyze',json={'situation':'My friend said bojio.', 'context':'They explicitly said they felt excluded, not joking.'})
    assert r.status_code == 200
    assert r.json()['mode'] == 'gemini'
    assert 'excluded' in r.json()['summary']
    payload = json.loads(seen[0]['contents'][0]['parts'][0]['text'])
    assert 'not joking' in payload['input']['context']
    assert payload['cards'][0]['provenance']['review_status'] == 'synthetic_unreviewed'
    assert seen[0]['systemInstruction']


def test_provider_invalid_evidence_and_timeout_are_safe(monkeypatch):
    import json
    import httpx
    monkeypatch.setenv('AI_PROVIDER','gemini')
    monkeypatch.setenv('GEMINI_API_KEY','secret-test-value')
    def bad(url, **kwargs):
        return httpx.Response(200,json={'candidates':[{'content':{'parts':[{'text':json.dumps({
            'summary':'unsupported','possible_meanings':[], 'do_not_assume':[],
            'clarifying_questions':[], 'next_action':'Ask.', 'learning_prompt':'Try.',
            'card_ids':['invented-peer-card']})}]}}]},request=httpx.Request('POST',url))
    monkeypatch.setattr('app.services.ai_service.httpx.post',bad)
    r=client.post('/api/v1/analyze',json={'situation':'Bojio after lunch.'})
    assert r.status_code == 503
    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout('secret-test-value')
    monkeypatch.setattr('app.services.ai_service.httpx.post',timeout)
    r=client.post('/api/v1/analyze',json={'situation':'Bojio after lunch.'})
    assert r.status_code == 503
    assert 'secret-test-value' not in r.text


def test_gemini_practice_receives_original_context_and_reply(monkeypatch):
    import json
    import httpx
    monkeypatch.setenv('AI_PROVIDER','gemini')
    monkeypatch.setenv('GEMINI_API_KEY','test-only')
    captured=[]
    def respond(url,**kwargs):
        captured.append(json.loads(kwargs['json']['contents'][0]['parts'][0]['text']))
        output={'feedback':'You acknowledge the invitation request.',
                'strengths':['You offer a next step.'], 'improvements':['Ask about their availability.'],
                'suggested_revision':'Would you like to join us tomorrow?'}
        return httpx.Response(200,json={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':json.dumps(output)}]}}]}, request=httpx.Request('POST',url))
    monkeypatch.setattr('app.services.ai_service.httpx.post',respond)
    data={'situation':'They said bojio.', 'context':'We have just met.', 'card_id':'sg-humour-01',
          'response':'Would you like to join next time?'}
    r=client.post('/api/v1/practice',json=data)
    assert r.status_code==200
    assert r.json()['mode']=='gemini'
    assert r.json()['strengths']
    assert captured[0]['input']==data
    assert captured[0]['criteria']


def test_blocked_or_empty_generation_never_becomes_guidance(monkeypatch):
    import httpx
    monkeypatch.setenv('AI_PROVIDER','gemini')
    monkeypatch.setenv('GEMINI_API_KEY','test-only')
    for payload in [{'promptFeedback':{'blockReason':'SAFETY'}},
                    {'candidates':[{'finishReason':'MAX_TOKENS','content':{'parts':[{'text':'{}'}]}}]},
                    {'candidates':[{'content':{'parts':[]}}]}]:
        monkeypatch.setattr('app.services.ai_service.httpx.post',lambda url, **kw: httpx.Response(200,json=payload,request=httpx.Request('POST',url)))
        assert client.post('/api/v1/analyze',json={'situation':'They said bojio.'}).status_code==503


def test_generation_limits_evidence_and_excludes_fictional_facts(monkeypatch):
    import json
    import httpx
    from app.schemas import Guidance
    from app.services.ai_service import generate, retrieve
    monkeypatch.setenv('GEMINI_API_KEY','test-only')
    captured=[]
    def send(url, **kw):
        captured.append(kw['json'])
        output={'summary':'They felt excluded.', 'possible_meanings':[], 'do_not_assume':[],
                'clarifying_questions':[], 'next_action':'Ask about joining next time.',
                'learning_prompt':'Try a reply.', 'card_ids':['sg-humour-01']}
        return httpx.Response(200,json={'candidates':[{'content':{'parts':[{'text':json.dumps(output)}]}}]},request=httpx.Request('POST',url))
    monkeypatch.setattr('app.services.ai_service.httpx.post',send)
    generate(Guidance,{'task':'explain','input':{'situation':'They said bojio.'},'cards':retrieve('They said bojio.')})
    schema=captured[0]['generationConfig']['responseJsonSchema']
    assert schema['properties']['card_ids']['items']['enum']==['sg-humour-01']
    payload=json.loads(captured[0]['contents'][0]['parts'][0]['text'])
    assert 'scenario' not in payload['cards'][0]
    assert 'suggested_response' not in payload['cards'][0]
