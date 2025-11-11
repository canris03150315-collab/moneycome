import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronLeftIcon } from './icons';

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={onClick}
        className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-800 focus:outline-none"
      >
        <span>{question}</span>
        <ChevronDownIcon
          className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-screen pt-4' : 'max-h-0'
        }`}
      >
        <div className="text-gray-600 prose prose-sm max-w-none">
          {answer}
        </div>
      </div>
    </div>
  );
};


const faqData = [
    {
      q: 'Q：一番賞規則/商品下套規則',
      a: (
        <>
            <p>一番賞是一種抽獎遊戲，每套商品都有固定數量的籤。每張籤都對應一個獎品。購買一張籤，即可隨機獲得一個獎品。</p>
            <p>當您購買最後一張籤時，除了該籤對應的獎品外，您還能額外獲得「最後賞」。</p>
            <p>「包套」是指一次性購買該套一番賞剩餘的所有籤。這將保證您獲得所有剩餘的獎品，包括「最後賞」。</p>
        </>
      ),
    },
    {
      q: 'Q：關於抽獎方式',
      a: (
        <>
            <p>
                我們致力於提供一個完全透明且公平的抽獎環境。為此，本站採用了加密學中成熟的<strong>「可驗證公平性 (Provably Fair)」</strong>技術。這套系統讓您不需單純相信我們，而是可以透過數學方法親自驗證每一次抽獎的公正性。
            </p>
            <p>
                此系統建立在一個核心概念之上：<strong>承諾方案 (Commitment Scheme)</strong>。我們在您抽獎<strong>前</strong>，就對結果做出一個加密的「承諾」(一個 Hash 值)，並在抽獎<strong>後</strong>，提供給您所有用來驗證該承諾所需的原始資料。
            </p>
            <p>
                整個驗證機制分為兩個層級：
            </p>

            <h4>第一層：整套籤池的公平性 (最終驗證)</h4>
            <p>
                此層級保證了整套一番賞<strong>從頭到尾所有獎品的抽出順序</strong>在開賣前就已固定，絕無可能被中途竄改。
            </p>
            <ol>
                <li><strong>生成秘密：</strong>在商品上架、任何人抽獎前，系統會生成一個高熵的、秘密的<strong>「籤池種子碼 (Pool Seed)」</strong>。</li>
                <li><strong>確定順序：</strong>系統會將該套一番賞的所有獎品 (例如 80 個) 排列成一個固定的<strong>「完整籤序 (Prize Order)」</strong>。</li>
                <li><strong>做出承諾：</strong>系統會將這兩段資訊組合成一個字串 (格式為：<code>{`{Pool Seed}|{Prize Order}`}</code>)，然後使用 <strong>SHA-256</strong> 這個單向加密演算法，將其轉換為一組獨一無二的加密指紋，稱為<strong>「籤池承諾 Hash」</strong>。</li>
                <li><strong>公開承諾：</strong>這個「籤池承諾 Hash」会立即顯示在商品頁面上，供所有人查看。由於 SHA-256 的單向性，任何人都不可能從這個 Hash 反推出原始的種子碼或籤序。</li>
                <li><strong>公開驗證：</strong>當商品<strong>完全售完</strong>後，我們會將當初的「籤池種子碼」與「完整籤序」完全公開。任何人都可以用同樣的 SHA-256 演算法，對公開的這兩項資料進行加密，並比對計算出的結果是否與我們一開始就公布的「籤池承諾 Hash」完全一致。</li>
            </ol>

            <h4>第二層：您單筆抽獎的公平性 (即時驗證)</h4>
            <p>
                此層級保證了您<strong>每一次抽獎的結果</strong>在確認的瞬間就已確定，並且與整套籤池的預設順序相符。
            </p>
             <ol>
                <li><strong>生成金鑰：</strong>在您按下「確認抽獎」的那一刻，系統會專門為您這筆訂單生成一把一次性的、獨一無二的<strong>「秘密金鑰 (Secret Key)」</strong>。</li>
                <li><strong>做出承諾：</strong>系統會立即使用 SHA-256 演算法對這把「秘密金鑰」進行加密，產生一個<strong>「抽獎 Hash」</strong>。</li>
                <li><strong>即時鎖定：</strong>這個「抽獎 Hash」會<strong>在獎品揭曉前</strong>就立刻儲存在您的訂單紀錄中。這相當於一個時間戳，證明了您的抽獎結果在此刻已被鎖定。</li>
                <li><strong>事後驗證：</strong>抽獎完成後，您的「秘密金鑰」會連同「抽獎 Hash」一起顯示在您的訂單歷史中。您可以隨時將您的「秘密金鑰」複製到「公平性驗證」頁面的工具中，親自計算其 SHA-256 Hash 值，並確認它與您訂單中記錄的「抽獎 Hash」是否完全相符。</li>
            </ol>
            <p>
                透過這兩層滴水不漏的加密驗證，我們確保了從整體到個體的絕對公平。歡迎您隨時前往「公平性驗證」頁面親自操作，體驗真正的透明與公正。
            </p>
        </>
      ),
    },
    {
      q: 'Q：關於排隊機制、儲值相關問題',
      a: (
        <>
            <p><strong>排隊機制：</strong>為避免多位使用者同時選擇同一張籤造成衝突，我們引入了排隊機制。當您進入商品頁面時，點擊「排隊抽獎」即可加入隊列。輪到您時，您將有固定的操作時間來選擇籤紙並完成抽獎。</p>
            <p><strong>儲值點數：</strong>本站所有消費皆使用「P點」進行。您可以在「個人資料」頁面或在抽獎頁面點數不足時，進行儲值。</p>
        </>
      ),
    },
     {
      q: 'Q：關於獎品回收、運送、自取',
      a: (
        <>
            <p><strong>獎品回收：</strong>部分較低價值的獎品 (例如 D賞、E賞等) 可以選擇在您的「個人收藏」頁面中進行回收，以換取少量P點。此操作無法復原。</p>
            <p><strong>運送申請：</strong>您可以在「個人收藏」頁面中，選取多個您擁有的獎品，一次性申請運送。系統會根據總重量計算運費 (以P點支付)，並請您填寫收件地址。</p>
            <p><strong>店面自取：</strong>部分商品支援店面自取服務。您同樣可以在「個人收藏」中選取獎品，申請自取。申請後，待店員備貨完成，系統會通知您可以前往指定店面領取。</p>
        </>
      ),
    },
];

export const FAQPage: React.FC = () => {
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleItemClick = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
             <div className="relative mb-6">
                <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center text-gray-700 hover:text-black font-semibold transition-colors">
                    <ChevronLeftIcon className="h-6 w-6" />
                    <span>返回</span>
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800">常見問題</h1>
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 lg:p-8">
                {faqData.map((item, index) => (
                    <FAQItem
                        key={index}
                        question={item.q}
                        answer={item.a}
                        isOpen={openIndex === index}
                        onClick={() => handleItemClick(index)}
                    />
                ))}
            </div>
        </div>
    );
};